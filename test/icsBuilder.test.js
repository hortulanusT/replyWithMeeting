import test from "node:test";
import assert from "node:assert/strict";
import { buildMeetingIcs } from "../src/icsBuilder.js";

test("buildMeetingIcs creates required VCALENDAR fields", () => {
  const ics = buildMeetingIcs({
    uid: "abc-123@example.com",
    now: new Date("2026-04-11T08:00:00Z"),
    start: new Date("2026-04-12T09:00:00Z"),
    end: new Date("2026-04-12T09:30:00Z"),
    organizer: {
      name: "Organizer",
      email: "organizer@example.com"
    },
    attendees: [
      {
        name: "Bob",
        email: "bob@example.com"
      }
    ],
    summary: "Meeting: Project",
    description: "Discussion"
  });

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /METHOD:REQUEST/);
  assert.match(ics, /UID:abc-123@example.com/);
  assert.match(ics, /SUMMARY:Meeting: Project/);
  assert.match(ics, /ORGANIZER;CN=Organizer:mailto:organizer@example.com/);
  assert.match(ics, /ATTENDEE;CN=Bob.*mailto:bob@example.com/);
  assert.match(ics, /END:VCALENDAR/);
});
