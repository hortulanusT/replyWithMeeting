import test from "node:test";
import assert from "node:assert/strict";
import { extractPlainText, pickBodyText, truncateBody } from "../src/body.js";

const fakeConvert = async (html) => `converted:${html.replace(/<[^>]+>/g, "")}`;

test("pickBodyText prefers text/plain over text/html", async () => {
    const longText = "Hello ".repeat(50).trim();
    const parts = [
        { contentType: "text/html", content: `<p>${longText}</p>` },
        { contentType: "text/plain", content: `${longText}\n` }
    ];
    assert.equal(await pickBodyText(parts, fakeConvert), longText);
});

test("pickBodyText keeps a short text/plain part when HTML is not longer", async () => {
    const parts = [
        { contentType: "text/html", content: "<p>Hi</p>" },
        { contentType: "text/plain", content: "Hi there\n" }
    ];
    assert.equal(await pickBodyText(parts, async (html) => html.replace(/<[^>]+>/g, "")), "Hi there");
});

test("pickBodyText uses the HTML body when text/plain is only a stub", async () => {
    const parts = [
        { contentType: "text/plain", content: "Please view this message in an HTML-capable client." },
        { contentType: "text/html", content: "<p>The actual message with all the details about the meeting.</p>" }
    ];
    assert.equal(
        await pickBodyText(parts, fakeConvert),
        "converted:The actual message with all the details about the meeting."
    );
});

test("pickBodyText converts HTML-only messages", async () => {
    const parts = [{ contentType: "text/html; charset=utf-8", content: "<p>Hi <b>there</b></p>" }];
    assert.equal(await pickBodyText(parts, fakeConvert), "converted:Hi there");
});

test("pickBodyText ignores empty and non-body text parts", async () => {
    const parts = [
        { contentType: "text/plain", content: "   " },
        { contentType: "text/calendar", content: "BEGIN:VCALENDAR" },
        { contentType: "text/html", content: "<p>Body</p>" }
    ];
    assert.equal(await pickBodyText(parts, fakeConvert), "converted:Body");
    assert.equal(await pickBodyText([], fakeConvert), "");
    assert.equal(await pickBodyText(undefined, fakeConvert), "");
});

test("extractPlainText skips attached text files", () => {
    const message = {
        contentType: "multipart/mixed",
        parts: [
            { contentType: "text/plain", name: "notes.txt", body: "attachment text" },
            {
                contentType: "text/plain",
                headers: { "content-disposition": ["attachment; filename=log.txt"] },
                body: "log text"
            },
            {
                contentType: "multipart/alternative",
                parts: [
                    { contentType: "text/plain", body: "Real body\n" },
                    { contentType: "text/html", body: "<p>Real body</p>" }
                ]
            }
        ]
    };
    assert.equal(extractPlainText(message), "Real body");
});

test("extractPlainText returns empty string for HTML-only messages", () => {
    assert.equal(extractPlainText({ contentType: "text/html", body: "<p>Hi</p>" }), "");
});

test("truncateBody leaves short bodies unchanged", () => {
    assert.equal(truncateBody("short body", 50), "short body");
    assert.equal(truncateBody("", 50), "");
});

test("truncateBody cuts long bodies at a word boundary and marks the cut", () => {
    const text = "word ".repeat(30).trim();
    const result = truncateBody(text, 52);
    assert.ok(result.endsWith("\n[…]"));
    const kept = result.slice(0, -"\n[…]".length);
    assert.ok(kept.length <= 52);
    assert.ok(kept.endsWith("word"));
});

test("truncateBody hard-cuts when there is no break near the limit", () => {
    const text = "x".repeat(100);
    assert.equal(truncateBody(text, 10), `${"x".repeat(10)}\n[…]`);
});
