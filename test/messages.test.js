import test from "node:test";
import assert from "node:assert/strict";
import { pickNewestMessage } from "../src/messages.js";

test("pickNewestMessage returns the most recent message", () => {
    const messages = [
        { id: 1, date: new Date("2026-10-20T08:00:00Z") },
        { id: 2, date: new Date("2026-10-21T08:00:00Z") },
        { id: 3, date: new Date("2026-10-19T08:00:00Z") }
    ];
    assert.equal(pickNewestMessage(messages).id, 2);
});

test("pickNewestMessage keeps the first entry on ties and missing dates", () => {
    const same = new Date("2026-10-20T08:00:00Z");
    assert.equal(pickNewestMessage([{ id: 1, date: same }, { id: 2, date: same }]).id, 1);
    assert.equal(pickNewestMessage([{ id: 1 }, { id: 2 }]).id, 1);
    assert.equal(pickNewestMessage([{ id: 1 }, { id: 2, date: same }]).id, 2);
});

test("pickNewestMessage handles empty input", () => {
    assert.equal(pickNewestMessage([]), null);
    assert.equal(pickNewestMessage(undefined), null);
});
