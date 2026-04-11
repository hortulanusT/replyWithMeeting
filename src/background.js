import { collectInviteeEmails, stripRePrefix } from "./email.js";
import { buildMeetingIcs } from "./icsBuilder.js";

const TITLE = "Reply with Meeting";
const INTRO_TEXT = "Meeting proposal:\n- Date:\n- Time:\n- Agenda:\n\n";

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

function selectOrganizer(identities) {
  const preferred = identities.find((identity) => identity.default);
  const fallback = identities[0];
  const chosen = preferred ?? fallback;

  if (!chosen || !chosen.email) {
    throw new Error("No Thunderbird identity available for organizer.");
  }

  return {
    email: chosen.email,
    name: chosen.name || chosen.label || chosen.email
  };
}

function createMeetingWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 24);

  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { start, end };
}

function buildAttendees(inviteeEmails) {
  return inviteeEmails.map((email) => ({
    email,
    name: email
  }));
}

function addIntroText(details) {
  if (details.isPlainText) {
    const existing = details.plainTextBody || "";
    return { plainTextBody: `${INTRO_TEXT}${existing}` };
  }

  const existingHtml = details.body || "";
  const introHtml = `<p>${INTRO_TEXT.replace(/\n/g, "<br>")}</p>`;
  return { body: `${introHtml}${existingHtml}` };
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
  const fullMessage = await messenger.messages.get(displayedMessage.id);

  const identities = await messenger.identities.list();
  const ownEmails = await getOwnEmails();

  const inviteeEmails = collectInviteeEmails(fullMessage, ownEmails);
  if (inviteeEmails.length === 0) {
    throw new Error("No invitees detected in this message.");
  }

  const composeTab = await messenger.compose.beginReply(displayedMessage.id, "replyToAll");
  const composeDetails = await messenger.compose.getComposeDetails(composeTab.id);
  await messenger.compose.setComposeDetails(composeTab.id, addIntroText(composeDetails));

  const organizer = selectOrganizer(identities);
  const attendees = buildAttendees(inviteeEmails);
  const meetingWindow = createMeetingWindow();

  const now = new Date();
  const subjectBase = stripRePrefix(fullMessage.subject);
  const uid = `${now.getTime()}-${Math.random().toString(16).slice(2)}@reply-with-meeting`;

  const ics = buildMeetingIcs({
    uid,
    now,
    start: meetingWindow.start,
    end: meetingWindow.end,
    organizer,
    attendees,
    summary: `Meeting: ${subjectBase}`,
    description: `Proposed from message: ${fullMessage.subject || "(no subject)"}`
  });

  const file = new File([ics], "meeting-invite.ics", {
    type: "text/calendar"
  });

  await messenger.compose.addAttachment(composeTab.id, {
    file,
    name: "meeting-invite.ics"
  });

  await notify(TITLE, `Created reply with ${inviteeEmails.length} invitee(s).`);
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
