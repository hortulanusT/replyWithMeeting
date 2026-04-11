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
    getAPI(context) {
        function fail(msg) {
            console.error("[calendarDialog experiment]", msg);
            throw new context.cloneScope.Error(msg);
        }

        return {
            calendarDialog: {
                async openNewEventDialog({ summary, description, attendees, startTime, endTime }) {
                    // --- Verify calendar XPCOM components are present ---
                    if (!Cc["@mozilla.org/calendar/event;1"]) {
                        fail("Calendar XPCOM component not found. Ensure the built-in Calendar is enabled.");
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
                        ev.id = Services.uuid
                            .generateUUID()
                            .toString()
                            .replace(/[{}]/g, "");
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

                            const tzService = Cc["@mozilla.org/calendar/timezone-service;1"]
                                .getService(Ci.calITimezoneService);
                            const timezone = tzService.floating || tzService.defaultTimezone;
                            if (!timezone) {
                                throw new Error("No calendar timezone available");
                            }

                            const dtXpcom = Cc["@mozilla.org/calendar/datetime;1"]
                                .createInstance(Ci.calIDateTime);
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
                            a.rsvp = true;
                            eventXpcom.wrappedJSObject.addAttendee(a);
                        } catch (e) {
                            fail(`Failed to add attendee ${att.email}: ${e.message}`);
                        }
                    }

                    // --- Pick a writable calendar ---
                    let defaultCalendar = null;
                    try {
                        const mgr = Cc["@mozilla.org/calendar/manager;1"].getService(
                            Ci.nsISupports
                        ).wrappedJSObject;
                        const calendars = mgr.getCalendars();
                        defaultCalendar =
                            calendars.find(
                                (c) => !c.readOnly && c.getProperty("disabled") !== true
                            ) ?? null;
                    } catch (e) {
                        console.warn("[calendarDialog experiment] calendar manager unavailable:", e.message);
                    }

                    // --- Open native event editor ---
                    const mailWindow = Services.wm.getMostRecentWindow("mail:3pane");
                    if (!mailWindow) {
                        fail("Could not find a Thunderbird window.");
                    }

                    // Lightning's isItemChanged() reads calendarEvent.calendar.id on cancel/close.
                    // Assign the calendar to the event so that path doesn't crash.
                    if (defaultCalendar) {
                        eventXpcom.wrappedJSObject.calendar = defaultCalendar;
                    }

                    try {
                        mailWindow.openDialog(
                            "chrome://calendar/content/calendar-event-dialog.xhtml",
                            "_blank",
                            "chrome,titlebar,resizable,status,dialog=no",
                            {
                                calendarEvent: eventXpcom,
                                calendar: defaultCalendar,
                                mode: "new",
                                onOk: null
                            }
                        );
                    } catch (e) {
                        fail(`Failed to open calendar dialog: ${e.message}`);
                    }
                }
            }
        };
    }
};
