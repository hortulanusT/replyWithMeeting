import test from "node:test";
import assert from "node:assert/strict";
import { collectInvitees, parseMailboxFallback, stripReplyPrefixes } from "../src/email.js";

test("collectInvitees deduplicates and excludes own identity", () => {
    const mailboxes = [
        { email: "alice@example.com", name: "Alice Example" },
        { email: "bob@example.com", name: "Bob" },
        { email: "carol@example.com", name: "Carol" },
        { email: "Alice@Example.com", name: "Alice Example" },
        { email: "BOB@example.com", name: "" },
        { email: "dan@example.com", name: "Dan" }
    ];

    const result = collectInvitees(mailboxes, ["alice@example.com"]);
    assert.deepEqual(result, [
        { email: "bob@example.com", name: "Bob" },
        { email: "carol@example.com", name: "Carol" },
        { email: "dan@example.com", name: "Dan" }
    ]);
});

test("collectInvitees keeps the first non-empty display name", () => {
    const result = collectInvitees([
        { email: "bob@example.com", name: "" },
        { email: "bob@example.com", name: "Bob Builder" },
        { email: "bob@example.com", name: "Robert" }
    ]);
    assert.deepEqual(result, [{ email: "bob@example.com", name: "Bob Builder" }]);
});

test("collectInvitees returns empty array when all emails are excluded", () => {
    const result = collectInvitees(
        [{ email: "alice@example.com", name: "Alice Example" }],
        ["alice@example.com"]
    );
    assert.deepEqual(result, []);
});

test("parseMailboxFallback prefers the angle-bracket address", () => {
    assert.deepEqual(parseMailboxFallback("\"old@x.com\" <new@y.com>"), { email: "new@y.com", name: "old@x.com" });
    assert.deepEqual(parseMailboxFallback("\"Doe, John\" <john@example.com>"), { email: "john@example.com", name: "Doe, John" });
    assert.deepEqual(parseMailboxFallback("Til Gärtner <til@example.org>"), { email: "til@example.org", name: "Til Gärtner" });
});

test("parseMailboxFallback handles bare and invalid addresses", () => {
    assert.deepEqual(parseMailboxFallback("bob@example.com"), { email: "bob@example.com", name: "" });
    assert.deepEqual(parseMailboxFallback("user@example.xn--p1ai"), { email: "user@example.xn--p1ai", name: "" });
    assert.equal(parseMailboxFallback("Undisclosed recipients:;"), null);
    assert.equal(parseMailboxFallback(""), null);
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
