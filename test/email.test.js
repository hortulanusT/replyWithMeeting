import test from "node:test";
import assert from "node:assert/strict";
import { collectInviteeEmails, stripReplyPrefixes } from "../src/email.js";

test("collectInviteeEmails deduplicates and excludes own identity", () => {
    const message = {
        author: "Alice Example <alice@example.com>",
        recipients: [
            "Bob <bob@example.com>",
            "Carol <carol@example.com>",
            "Alice Example <alice@example.com>"
        ],
        ccList: ["Bob <bob@example.com>", "Dan <dan@example.com>"]
    };

    const result = collectInviteeEmails(message, ["alice@example.com"]);
    assert.deepEqual(result, ["bob@example.com", "carol@example.com", "dan@example.com"]);
});

test("collectInviteeEmails returns empty array when all emails are excluded", () => {
    const message = {
        author: "Alice Example <alice@example.com>",
        recipients: ["Alice Example <alice@example.com>"],
        ccList: []
    };

    const result = collectInviteeEmails(message, ["alice@example.com"]);
    assert.deepEqual(result, []);
});

test("stripReplyPrefixes removes single re prefix", () => {
    assert.equal(stripReplyPrefixes("Re: Quarterly planning"), "Quarterly planning");
    assert.equal(stripReplyPrefixes("status"), "status");
});

test("stripReplyPrefixes removes repeated and localized prefixes", () => {
    assert.equal(stripReplyPrefixes("AW: AW: Projekt"), "Projekt");
    assert.equal(stripReplyPrefixes("Antw: Fwd: Planning"), "Planning");
    assert.equal(stripReplyPrefixes("WG: Re: FW: Doorst: Budget"), "Budget");
    assert.equal(stripReplyPrefixes("RE[2]: aw(3):Status"), "Status");
    assert.equal(stripReplyPrefixes("  re :  spaced"), "spaced");
});

test("stripReplyPrefixes keeps words that only start like a prefix", () => {
    assert.equal(stripReplyPrefixes("Review: Q3 numbers"), "Review: Q3 numbers");
    assert.equal(stripReplyPrefixes("Awards ceremony"), "Awards ceremony");
    assert.equal(stripReplyPrefixes("Agenda: Re: Budget"), "Agenda: Re: Budget");
});

test("stripReplyPrefixes falls back for empty subjects", () => {
    assert.equal(stripReplyPrefixes("", "(none)"), "(none)");
    assert.equal(stripReplyPrefixes("Re: ", "(none)"), "(none)");
});
