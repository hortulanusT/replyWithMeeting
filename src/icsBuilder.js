function formatDateUtc(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line) {
  const limit = 72;
  if (line.length <= limit) {
    return line;
  }

  const chunks = [];
  let cursor = 0;
  while (cursor < line.length) {
    const segment = line.slice(cursor, cursor + limit);
    chunks.push(cursor === 0 ? segment : ` ${segment}`);
    cursor += limit;
  }

  return chunks.join("\r\n");
}

export function buildMeetingIcs({
  uid,
  now,
  start,
  end,
  organizer,
  attendees,
  summary,
  description
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//replyWithMeeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${escapeText(uid)}`,
    `DTSTAMP:${formatDateUtc(now)}`,
    `DTSTART:${formatDateUtc(start)}`,
    `DTEND:${formatDateUtc(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `ORGANIZER;CN=${escapeText(organizer.name)}:mailto:${organizer.email}`,
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE"
  ];

  for (const attendee of attendees) {
    lines.push(
      `ATTENDEE;CN=${escapeText(attendee.name)};CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee.email}`
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
