import { collectInviteeEmails, stripRePrefix } from "./email.js";

const TITLE = "Reply with Meeting";

async function getDisplayedMessage(tabId) {
    const displayed = await messenger.messageDisplay.getDisplayedMessages(tabId);
    const message = displayed?.messages?.[0] ?? null;
    if (!message) {
        throw new Error("No message found in current tab.");
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

async function notify(title, message) {
    await messenger.notifications.create({
        type: "basic",
        iconUrl: "icons/reply-with-meeting.svg",
        title,
        message
    });
}

async function runReplyWithMeeting(tab) {
    const displayedMessage = await getDisplayedMessage(tab.id);
    const [fullMessage, fullMessageBody, ownEmails] = await Promise.all([
        messenger.messages.get(displayedMessage.id),
        messenger.messages.getFull(displayedMessage.id),
        getOwnEmails()
    ]);

    const inviteeEmails = collectInviteeEmails(fullMessage, ownEmails);
    if (inviteeEmails.length === 0) {
        throw new Error("No invitees detected in this message.");
    }

    const attendees = inviteeEmails.map((email) => ({ email, name: email }));
    const meetingWindow = createMeetingWindow();
    const subjectBase = stripRePrefix(fullMessage.subject);
    const bodyText = extractPlainText(fullMessageBody);
    const description = bodyText
        ? `--- Original message ---\n${bodyText.trim()}`
        : `Proposed from: ${fullMessage.subject || "(no subject)"}`;

    await messenger.calendarDialog.openNewEventDialog({
        summary: `Meeting: ${subjectBase}`,
        description,
        attendees,
        startTime: toLocalIsoNoTimezone(meetingWindow.start),
        endTime: toLocalIsoNoTimezone(meetingWindow.end)
    });
}

messenger.messageDisplayAction.onClicked.addListener(async (tab) => {
    try {
        await runReplyWithMeeting(tab);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Reply with Meeting failed", error);
        await notify(TITLE, message);
    }
});
