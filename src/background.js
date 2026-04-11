import { collectInviteeEmails, stripRePrefix } from "./email.js";

function i18n(key, substitutions) {
    return messenger.i18n.getMessage(key, substitutions) || key;
}

async function getDisplayedMessage(tabId) {
    const displayed = await messenger.messageDisplay.getDisplayedMessages(tabId);
    const message = displayed?.messages?.[0] ?? null;
    if (!message) {
        throw new Error(i18n("errorNoMessageInTab"));
    }
    return message;
}

async function getOwnEmails() {
    const identities = await messenger.identities.list();
    return identities
        .map((identity) => String(identity.email || "").trim().toLowerCase())
        .filter(Boolean);
}

function createMeetingWindow() {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start, end };
}

function toLocalIsoNoTimezone(date) {
    const pad = (value) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function extractPlainText(part) {
    if (part.contentType === "text/plain" && part.body) {
        return part.body;
    }
    for (const sub of part.parts ?? []) {
        const text = extractPlainText(sub);
        if (text) return text;
    }
    return "";
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

function toEpochMs(value) {
    if (!value) {
        return Date.now();
    }
    if (value instanceof Date) {
        return value.getTime();
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? Date.now() : parsed;
}

async function buildReplyHeader(message) {
    const messageDate = toEpochMs(message.date);
    const author = String(message.author || "").trim();
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

async function notify(title, message) {
    await messenger.notifications.create({
        type: "basic",
        iconUrl: "icons/reply-with-meeting.svg",
        title,
        message
    });
}

async function runReplyWithMeetingFromMessageId(messageId) {
    const [fullMessage, fullMessageBody, ownEmails] = await Promise.all([
        messenger.messages.get(messageId),
        messenger.messages.getFull(messageId),
        getOwnEmails()
    ]);

    const inviteeEmails = collectInviteeEmails(fullMessage, ownEmails);
    if (inviteeEmails.length === 0) {
        throw new Error(i18n("errorNoInvitees"));
    }

    const attendees = inviteeEmails.map((email) => ({ email, name: email }));
    const meetingWindow = createMeetingWindow();
    const noSubject = i18n("noSubject");
    const subjectBase = stripRePrefix(fullMessage.subject, noSubject);
    const bodyText = extractPlainText(fullMessageBody);
    const replyHeader = await buildReplyHeader(fullMessage);
    const description = bodyText
        ? `${replyHeader}\n${bodyText.trim()}`
        : i18n("descriptionProposedFrom", [fullMessage.subject || noSubject]);

    await messenger.calendarDialog.openNewEventDialog({
        summary: `${i18n("meetingSummaryPrefix")}: ${subjectBase}`,
        description,
        attendees,
        startTime: toLocalIsoNoTimezone(meetingWindow.start),
        endTime: toLocalIsoNoTimezone(meetingWindow.end)
    });
}

async function runReplyWithMeeting(tab) {
    const displayedMessage = await getDisplayedMessage(tab.id);
    await runReplyWithMeetingFromMessageId(displayedMessage.id);
}

messenger.menus.create({
    id: "reply-with-meeting-message-list",
    contexts: ["message_list"],
    title: i18n("actionTitle")
});

messenger.menus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "reply-with-meeting-message-list") {
        return;
    }

    try {
        const selectedMessageId = info.selectedMessages?.messages?.[0]?.id ?? null;
        if (selectedMessageId) {
            await runReplyWithMeetingFromMessageId(selectedMessageId);
            return;
        }

        if (tab?.id) {
            await runReplyWithMeeting(tab);
            return;
        }

        throw new Error(i18n("errorNoMessageInTab"));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(i18n("errorActionFailedLog"), error);
        await notify(i18n("notificationTitle"), message);
    }
});

messenger.messageDisplayAction.onClicked.addListener(async (tab) => {
    try {
        await runReplyWithMeeting(tab);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(i18n("errorActionFailedLog"), error);
        await notify(i18n("notificationTitle"), message);
    }
});
