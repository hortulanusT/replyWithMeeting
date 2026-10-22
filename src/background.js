import { extractPlainText, pickBodyText, truncateBody } from "./body.js";
import { createMeetingWindow, toEpochMs, toLocalIsoNoTimezone } from "./dates.js";
import { collectInvitees, parseListPostAddresses, parseMailboxFallback, stripReplyPrefixes } from "./email.js";
import { MAX_COMBINED_MESSAGES, pickNewestMessage } from "./messages.js";

function i18n(key, substitutions) {
    return messenger.i18n.getMessage(key, substitutions) || key;
}

// Collects message ids from a MessageList, following pagination, up to
// MAX_COMBINED_MESSAGES.
async function collectMessageIds(messageList) {
    const ids = [];
    let page = messageList;
    while (page) {
        for (const message of page.messages ?? []) {
            ids.push(message.id);
            if (ids.length >= MAX_COMBINED_MESSAGES) {
                console.warn(`Only the first ${MAX_COMBINED_MESSAGES} selected messages are used`);
                if (page.id) {
                    await messenger.messages.abortList?.(page.id);
                }
                return ids;
            }
        }
        page = page.id ? await messenger.messages.continueList(page.id) : null;
    }
    return ids;
}

async function getDisplayedMessageIds(tabId) {
    const ids = await collectMessageIds(await messenger.messageDisplay.getDisplayedMessages(tabId));
    if (ids.length === 0) {
        throw new Error(i18n("errorNoMessageInTab"));
    }
    return ids;
}

async function getOwnEmails() {
    const identities = await messenger.identities.list();
    return identities
        .map((identity) => String(identity.email || "").trim().toLowerCase())
        .filter(Boolean);
}

function flattenMailboxes(mailboxes) {
    return mailboxes.flatMap((mailbox) => (mailbox.group ? flattenMailboxes(mailbox.group) : [mailbox]));
}

// Parses header values such as "Doe, John <john@example.com>" into
// { email, name } using Thunderbird's RFC 5322 parser when available.
async function parseMailboxes(headerValues) {
    const parsed = await Promise.all(
        headerValues.filter(Boolean).map(async (value) => {
            try {
                return flattenMailboxes(await messenger.messengerUtilities.parseMailboxString(value));
            } catch (error) {
                console.warn("parseMailboxString unavailable, using fallback", error);
                const mailbox = parseMailboxFallback(value);
                return mailbox ? [mailbox] : [];
            }
        })
    );
    return parsed.flat();
}

// Returns the message's MIME headers (lowercase keys, array values) without
// decoding body parts; used for Reply-To and List-Post.
async function getMessageHeaders(messageId) {
    try {
        const full = await messenger.messages.getFull(messageId, { decodeContent: false });
        return full?.headers ?? {};
    } catch (error) {
        console.warn("Message headers unavailable", error);
        return {};
    }
}

// Returns the message body as plain text, converting HTML-only messages.
async function getBodyText(messageId) {
    try {
        const parts = await messenger.messages.listInlineTextParts(messageId);
        return await pickBodyText(parts, (html) => messenger.messengerUtilities.convertToPlainText(html));
    } catch (error) {
        console.warn("Inline text parts unavailable, falling back to getFull", error);
        return extractPlainText(await messenger.messages.getFull(messageId));
    }
}

function formatLocalDateTimeForFallback(dateLike) {
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

function fallbackReplyHeader(messageDate, author) {
    const formattedDate = formatLocalDateTimeForFallback(messageDate);
    const authorText = String(author || "").trim() || i18n("unknownAuthor");
    return i18n("replyHeaderFallback", [formattedDate, authorText]);
}

async function buildReplyHeader(message) {
    const messageDate = toEpochMs(message.date);
    const author = String(message.author || "").trim() || i18n("unknownAuthor");
    try {
        const header = await messenger.calendarDialog.buildReplyHeader({
            author,
            dateEpochMs: messageDate
        });
        if (typeof header === "string" && header.trim()) {
            return header.trim();
        }
    } catch (error) {
        console.warn("Reply header fallback triggered", error);
    }
    return fallbackReplyHeader(messageDate, author);
}

// Only messages written for users (already localized) are shown as-is;
// technical errors from the experiment or Thunderbird get a localized generic
// message, with details in the Error Console.
function toUserMessage(error) {
    const message = error instanceof Error ? error.message : String(error);
    const userMessages = new Set([i18n("errorNoMessageInTab"), i18n("errorNoWritableCalendar")]);
    return userMessages.has(message) ? message : i18n("errorUnexpected");
}

async function reportError(error) {
    console.error(i18n("errorActionFailedLog"), error);
    await notify(i18n("notificationTitle"), toUserMessage(error));
}

async function notify(title, message) {
    await messenger.notifications.create({
        type: "basic",
        iconUrl: "icons/reply-with-meeting.svg",
        title,
        message
    });
}

// Creates one meeting for one or more messages: attendees come from all of
// them, title/body/reply header from the most recent one.
async function runReplyWithMeetingForMessages(messageIds) {
    const [messages, ownEmails, headerLists] = await Promise.all([
        Promise.all(messageIds.map((id) => messenger.messages.get(id))),
        getOwnEmails(),
        Promise.all(messageIds.map((id) => getMessageHeaders(id)))
    ]);
    const fullMessage = pickNewestMessage(messages);
    const bodyText = await getBodyText(fullMessage.id);

    const mailboxes = await parseMailboxes(
        messages.flatMap((message, index) => [
            message.author,
            ...(headerLists[index]["reply-to"] ?? []),
            ...(message.recipients ?? []),
            ...(message.ccList ?? [])
        ])
    );
    // Don't invite the mailing list itself; its members are reached via the list.
    const listAddresses = headerLists.flatMap((headers) => parseListPostAddresses(headers["list-post"]));
    const attendees = collectInvitees(mailboxes, ownEmails, listAddresses)
        .map(({ email, name }) => ({ email, name: name || email }));
    const meetingWindow = createMeetingWindow();
    const noSubject = i18n("noSubject");
    const subjectBase = stripReplyPrefixes(fullMessage.subject, noSubject);
    const replyHeader = await buildReplyHeader(fullMessage);
    const description = bodyText
        ? `${replyHeader}\n${truncateBody(bodyText)}`
        : i18n("descriptionProposedFrom", [fullMessage.subject || noSubject]);

    await messenger.calendarDialog.openNewEventDialog({
        summary: `${i18n("meetingSummaryPrefix")}: ${subjectBase}`,
        description,
        attendees,
        startTime: toLocalIsoNoTimezone(meetingWindow.start),
        endTime: toLocalIsoNoTimezone(meetingWindow.end),
        strings: {
            title: i18n("notificationTitle"),
            noWritableCalendar: i18n("errorNoWritableCalendar"),
            saveFailed: i18n("errorSaveFailed"),
            invitationsNotSent: i18n("errorInvitationsNotSent")
        }
    });
}

async function runReplyWithMeeting(tab) {
    await runReplyWithMeetingForMessages(await getDisplayedMessageIds(tab.id));
}

// MV3 background scripts are restarted on demand and menus persist across those
// restarts, so creating the entry at top level would fail with a duplicate id.
// removeAll() keeps install, update and startup idempotent.
async function setupMenus() {
    await messenger.menus.removeAll();
    messenger.menus.create({
        id: "reply-with-meeting-message-list",
        contexts: ["message_list"],
        title: i18n("actionTitle")
    });
}

messenger.runtime.onInstalled.addListener(setupMenus);
messenger.runtime.onStartup.addListener(setupMenus);

messenger.menus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "reply-with-meeting-message-list") {
        return;
    }

    try {
        const selectedIds = info.selectedMessages ? await collectMessageIds(info.selectedMessages) : [];
        if (selectedIds.length > 0) {
            await runReplyWithMeetingForMessages(selectedIds);
            return;
        }

        if (tab?.id) {
            await runReplyWithMeeting(tab);
            return;
        }

        throw new Error(i18n("errorNoMessageInTab"));
    } catch (error) {
        await reportError(error);
    }
});

messenger.messageDisplayAction.onClicked.addListener(async (tab) => {
    try {
        await runReplyWithMeeting(tab);
    } catch (error) {
        await reportError(error);
    }
});
