import test from "node:test";
import assert from "node:assert/strict";
import { createMeetingWindow, toEpochMs, toLocalIsoNoTimezone } from "../src/dates.js";

test("createMeetingWindow returns tomorrow 09:00-10:00 local time", () => {
    const { start, end } = createMeetingWindow(new Date(2026, 9, 20, 15, 42));
    assert.equal(toLocalIsoNoTimezone(start), "2026-10-21T09:00:00");
    assert.equal(toLocalIsoNoTimezone(end), "2026-10-21T10:00:00");
});

test("createMeetingWindow rolls over month and year ends", () => {
    assert.equal(toLocalIsoNoTimezone(createMeetingWindow(new Date(2026, 9, 31, 8)).start), "2026-11-01T09:00:00");
    assert.equal(toLocalIsoNoTimezone(createMeetingWindow(new Date(2026, 11, 31, 23, 59)).start), "2027-01-01T09:00:00");
});

test("toLocalIsoNoTimezone pads all fields", () => {
    assert.equal(toLocalIsoNoTimezone(new Date(2027, 0, 2, 3, 4, 5)), "2027-01-02T03:04:05");
});

test("toEpochMs accepts dates, strings and numbers", () => {
    const date = new Date(Date.UTC(2026, 9, 20, 7, 30));
    assert.equal(toEpochMs(date), date.getTime());
    assert.equal(toEpochMs("2026-10-20T07:30:00Z"), date.getTime());
    assert.equal(toEpochMs(date.getTime()), date.getTime());
});

test("toEpochMs falls back to now for missing or invalid values", () => {
    assert.equal(toEpochMs(undefined, 42), 42);
    assert.equal(toEpochMs("not a date", 42), 42);
    assert.equal(toEpochMs(new Date("invalid"), 42), 42);
});
