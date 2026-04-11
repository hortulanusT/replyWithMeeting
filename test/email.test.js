import test from "node:test";
import assert from "node:assert/strict";
import { collectInviteeEmails, stripRePrefix } from "../src/email.js";

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

test("stripRePrefix removes single re prefix", () => {
    assert.equal(stripRePrefix("Re: Quarterly planning"), "Quarterly planning");
    assert.equal(stripRePrefix("status"), "status");
});
