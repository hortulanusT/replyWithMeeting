"use strict";

// Privileged experiment that opens Thunderbird's native calendar event dialog.
//
// XPCOM objects for calIEvent/calIAttendee/calIDateTime are created via Cc/Ci but
// modified through .wrappedJSObject (the raw JS implementation) to avoid the
// "Cannot modify properties of a WrappedNative" restriction that the XPConnect
// layer imposes inside a WebExtension experiment scope.
// The original XPCOM wrappers (not wrappedJSObject) are passed to the calendar
// dialog so it can do its own interface type-checks.

this.calendarDialog = class extends ExtensionCommon.ExtensionAPI {
    onShutdown(isAppShutdown) {
        if (isAppShutdown) {
            return;
        }
        // Thunderbird caches experiment scripts; without this, an add-on update or
        // reload can keep running the previous implementation.js.
        Services.obs.notifyObservers(null, "startupcache-invalidate");
    }

    getAPI(context) {
        function fail(msg) {
            console.error("[calendarDialog experiment]", msg);
            throw new context.cloneScope.Error(msg);
        }

        // Shows a modal alert on the mail window. The event dialog has already
        // closed when the save callback runs, so the user would otherwise never
        // learn that the event was not saved.
        function alertUser(mailWindow, title, message) {
            try {
                Services.prompt.alert(mailWindow, title, message);
            } catch (error) {
                console.error("[calendarDialog experiment] Failed to show alert", error);
            }
        }

        function commitDialogItem(mailWindow, newItem, calendar, originalItem, listener, extResponse, strings) {
            const targetCalendar = calendar || newItem?.calendar || originalItem?.calendar || null;
            if (!targetCalendar) {
                throw new Error(strings.noWritableCalendar);
            }

            if (typeof mailWindow.doTransaction === "function") {
                if (typeof mailWindow.ensureCalendarVisible === "function") {
                    mailWindow.ensureCalendarVisible(targetCalendar);
                }

                const isExistingItem = Boolean(newItem?.id && originalItem?.id);
                // doTransaction is async in current Thunderbird; without the catch a
                // failed save would be an unhandled rejection the user never sees.
                Promise.resolve(
                    mailWindow.doTransaction(
                        isExistingItem ? "modify" : "add",
                        newItem,
                        targetCalendar,
                        isExistingItem ? originalItem : null,
                        listener,
                        extResponse ?? null
                    )
                ).catch((error) => {
                    console.error("[calendarDialog experiment] Failed to persist calendar item", error);
                    alertUser(mailWindow, strings.title, `${strings.saveFailed}\n\n${error?.message ?? error}`);
                });
                return;
            }

            const savePromise = newItem?.id && originalItem?.id
                ? targetCalendar.modifyItem(newItem, originalItem)
                : targetCalendar.addItem(newItem);

            Promise.resolve(savePromise).then(
                (savedItem) => {
                    listener?.onTransactionComplete?.(savedItem, originalItem ?? null);
                    // This path bypasses Thunderbird's iTIP handling, so invitations
                    // are never sent; tell the user instead of failing silently.
                    if (newItem?.getAttendees?.().length) {
                        alertUser(mailWindow, strings.title, strings.invitationsNotSent);
                    }
                },
                (error) => {
                    console.error("[calendarDialog experiment] Failed to persist calendar item", error);
                    alertUser(mailWindow, strings.title, `${strings.saveFailed}\n\n${error?.message ?? error}`);
                }
            );
        }

        // Resolves the user's calendar timezone. getService(Ci.calITimezoneService)
        // fails in some Thunderbird builds, so prefer the window's cal.dtz helper and
        // fall back to the service's raw JS object (same pattern as the calendar manager).
        function getDefaultTimezone(mailWindow) {
            try {
                const timezone = mailWindow?.cal?.dtz?.defaultTimezone;
                if (timezone) {
                    return timezone;
                }
            } catch (error) {
                console.warn("[calendarDialog experiment] cal.dtz unavailable:", error);
            }

            try {
                const tzService = Cc["@mozilla.org/calendar/timezone-service;1"]
                    .getService(Ci.nsISupports).wrappedJSObject;
                const timezone = tzService?.defaultTimezone || tzService?.floating;
                if (timezone) {
                    return timezone;
                }
            } catch (error) {
                console.warn("[calendarDialog experiment] timezone service unavailable:", error);
            }
            return null;
        }

        function isWritableEventCalendar(calendar, calUtils) {
            if (!calendar || calendar.readOnly || calendar.getProperty("disabled") === true) {
                return false;
            }
            if (calendar.getProperty("capabilities.events.supported") === false) {
                return false;
            }
            try {
                if (calUtils?.acl?.isCalendarWritable && !calUtils.acl.isCalendarWritable(calendar)) {
                    return false;
                }
                if (calUtils?.acl?.userCanAddItemsToCalendar
                    && !calUtils.acl.userCanAddItemsToCalendar(calendar)) {
                    return false;
                }
            } catch (_) {
                // ACL helpers unavailable; rely on the checks above.
            }
            return true;
        }

        // Prefers the calendar selected in Thunderbird's calendar UI, then any
        // writable calendar. getService() on the calendar manager fails in newer
        // Thunderbird builds, so go through the window's cal helpers first.
        function getWritableCalendar(mailWindow) {
            const calUtils = mailWindow?.cal;

            try {
                const selected = calUtils?.view?.getCompositeCalendar?.(mailWindow)?.defaultCalendar;
                if (isWritableEventCalendar(selected, calUtils)) {
                    return selected;
                }
            } catch (error) {
                console.warn("[calendarDialog experiment] composite calendar unavailable:", error);
            }

            const managers = [
                () => calUtils?.manager,
                () => Cc["@mozilla.org/calendar/manager;1"].getService(Ci.nsISupports).wrappedJSObject
            ];
            for (const getManager of managers) {
                try {
                    const calendars = getManager()?.getCalendars?.() ?? [];
                    const writable = calendars.find((c) => isWritableEventCalendar(c, calUtils));
                    if (writable) {
                        return writable;
                    }
                } catch (error) {
                    console.warn("[calendarDialog experiment] calendar manager unavailable:", error);
                }
            }
            return null;
        }

        // Thunderbird stores its reply header templates as localized prefs. The
        // default pref value is a chrome:// URL that getComplexValue resolves to
        // the localized string; a user-customized value is returned as-is.
        function readReplyHeaderTemplate(prefName) {
            try {
                const value = Services.prefs.getComplexValue(prefName, Ci.nsIPrefLocalizedString).data;
                if (value && value.trim() && !value.startsWith("chrome://")) {
                    return value;
                }
            } catch (_) {
                // Pref missing or not localized; try the string bundles below.
            }

            const bundles = [
                "chrome://messenger/locale/messengercompose/composeMsgs.properties",
                "chrome://messenger/locale/messenger.properties"
            ];
            for (const url of bundles) {
                try {
                    const value = Services.strings.createBundle(url).GetStringFromName(prefName);
                    if (value && value.trim()) {
                        return value;
                    }
                } catch (_) {
                    // Ignore missing bundles/keys.
                }
            }
            return "";
        }

        // Returns "" when no native template is available so the caller can use
        // its own localized fallback.
        function buildNativeReplyHeader(author, dateEpochMs) {
            const safeAuthor = String(author || "").trim();
            if (!safeAuthor) {
                return "";
            }

            const date = new Date(Number(dateEpochMs));
            const hasDate = !Number.isNaN(date.getTime());

            // mailnews.reply_header_type: 1 = "#1 wrote:", 2 = "On #2 #3, #1 wrote:",
            // 3 = "#1 wrote On #2 #3:". Fall back to the other templates in order.
            const templateNames = {
                1: "mailnews.reply_header_authorwrotesingle",
                2: "mailnews.reply_header_ondateauthorwrote",
                3: "mailnews.reply_header_authorwroteondate"
            };
            let headerType = 2;
            try {
                headerType = Services.prefs.getIntPref("mailnews.reply_header_type", 2);
            } catch (_) {
                // Keep default.
            }
            const candidates = [templateNames[headerType], templateNames[2], templateNames[1]]
                .filter((name, index, all) => name && all.indexOf(name) === index);

            const values = { 1: safeAuthor };
            if (hasDate) {
                values[2] = new Services.intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
                values[3] = new Services.intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
            }

            for (const name of candidates) {
                const template = readReplyHeaderTemplate(name);
                if (!template) {
                    continue;
                }
                // Skip date-based templates when the message date is unusable.
                if (!hasDate && /#[23]/.test(template)) {
                    continue;
                }
                // Single pass so placeholder-like text inside the author is not re-expanded.
                return template.replace(/#([123])/g, (match, n) => values[n] ?? match).trim();
            }

            return "";
        }

        return {
            calendarDialog: {
                async buildReplyHeader({ author, dateEpochMs }) {
                    return buildNativeReplyHeader(author, dateEpochMs);
                },

                async openNewEventDialog({ summary, description, attendees, startTime, endTime, strings: localizedStrings }) {
                    const strings = {
                        title: "Reply with Meeting",
                        noWritableCalendar: "No writable calendar found. Create or enable a calendar first.",
                        saveFailed: "The event could not be saved.",
                        invitationsNotSent: "The event was saved, but invitations could not be sent.",
                        ...Object.fromEntries(
                            Object.entries(localizedStrings ?? {}).filter(([, value]) => value)
                        )
                    };

                    // --- Verify calendar XPCOM components are present ---
                    if (!Cc["@mozilla.org/calendar/event;1"]) {
                        fail("Calendar XPCOM component not found. Ensure the built-in Calendar is enabled.");
                    }

                    const mailWindow = Services.wm.getMostRecentWindow("mail:3pane");
                    if (!mailWindow) {
                        fail("Could not find a Thunderbird window.");
                    }

                    // --- Build calIEvent ---
                    let eventXpcom;
                    try {
                        eventXpcom = Cc["@mozilla.org/calendar/event;1"].createInstance();
                    } catch (e) {
                        fail(`Failed to create calIEvent: ${e.message}`);
                    }

                    try {
                        // wrappedJSObject is the raw CalEvent JS instance; property
                        // writes work here even when the XPCOM wrapper blocks them.
                        const ev = eventXpcom.wrappedJSObject;
                        ev.title = summary;
                        ev.setProperty("DESCRIPTION", description);
                        ev.setProperty("STATUS", "TENTATIVE");

                        // Dates: instantiate as calIDateTime so the datetime
                        // interface setters are available on this object.
                        const makeDateTime = (iso) => {
                            const m = String(iso).match(
                                /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
                            );
                            if (!m) {
                                throw new Error(`Invalid datetime value: ${iso}`);
                            }

                            const year = Number(m[1]);
                            const month = Number(m[2]) - 1;
                            const day = Number(m[3]);
                            const hour = Number(m[4]);
                            const minute = Number(m[5]);
                            const second = Number(m[6] || 0);

                            // Use the user's configured timezone so invitations carry a
                            // TZID; floating times would shift for attendees elsewhere.
                            const timezone = getDefaultTimezone(mailWindow);
                            if (!timezone) {
                                throw new Error("No calendar timezone available");
                            }

                            const dtXpcom = typeof mailWindow.cal?.createDateTime === "function"
                                ? mailWindow.cal.createDateTime()
                                : Cc["@mozilla.org/calendar/datetime;1"].createInstance(Ci.calIDateTime);
                            dtXpcom.resetTo(year, month, day, hour, minute, second, timezone);
                            return dtXpcom;
                        };
                        ev.startDate = makeDateTime(startTime);
                        ev.endDate = makeDateTime(endTime);
                    } catch (e) {
                        fail(`Failed to configure calendar event: ${e.message}`);
                    }

                    // --- Add attendees ---
                    for (const att of attendees) {
                        try {
                            const attXpcom = Cc["@mozilla.org/calendar/attendee;1"].createInstance();
                            const a = attXpcom.wrappedJSObject;
                            a.id = `mailto:${att.email}`;
                            if (att.name && att.name !== att.email) {
                                a.commonName = att.name;
                            }
                            a.role = "REQ-PARTICIPANT";
                            a.userType = "INDIVIDUAL";
                            a.participationStatus = "NEEDS-ACTION";
                            a.rsvp = "TRUE";
                            eventXpcom.wrappedJSObject.addAttendee(a);
                        } catch (e) {
                            fail(`Failed to add attendee ${att.email}: ${e.message}`);
                        }
                    }

                    // --- Pick a writable calendar ---
                    const defaultCalendar = getWritableCalendar(mailWindow);
                    if (!defaultCalendar) {
                        fail(strings.noWritableCalendar);
                    }

                    // --- Open native event editor ---

                    // Lightning's isItemChanged() reads calendarEvent.calendar.id on cancel/close.
                    // Assign the calendar to the event so that path doesn't crash.
                    eventXpcom.wrappedJSObject.calendar = defaultCalendar;

                    try {
                        const onOk = (newItem, calendar, originalItem, listener, extResponse) => {
                            try {
                                commitDialogItem(
                                    mailWindow,
                                    newItem,
                                    calendar,
                                    originalItem,
                                    listener,
                                    extResponse,
                                    strings
                                );
                            } catch (error) {
                                console.error(
                                    "[calendarDialog experiment] Failed to run dialog save callback",
                                    error
                                );
                                alertUser(mailWindow, strings.title, `${strings.saveFailed}\n\n${error?.message ?? error}`);
                            }
                        };

                        // Thunderbird's own openEventDialog honours calendar.item.editInTab.
                        // Its experimental create/edit dialog ignores the passed item for
                        // new events, which would drop our prefill, so open the classic
                        // dialog directly in that case.
                        const experimentalDialog = Services.prefs.getBoolPref(
                            "calendar.event.createEditDialog.enabled",
                            false
                        );
                        if (typeof mailWindow.openEventDialog === "function" && !experimentalDialog) {
                            mailWindow.openEventDialog(eventXpcom, defaultCalendar, "new", onOk);
                        } else {
                            mailWindow.openDialog(
                                "chrome://calendar/content/calendar-event-dialog.xhtml",
                                "_blank",
                                "chrome,titlebar,resizable,status,dialog=no",
                                {
                                    calendarEvent: eventXpcom,
                                    calendar: defaultCalendar,
                                    mode: "new",
                                    onOk
                                }
                            );
                        }
                    } catch (e) {
                        fail(`Failed to open calendar dialog: ${e.message}`);
                    }
                }
            }
        };
    }
};
