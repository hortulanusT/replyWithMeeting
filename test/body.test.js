import test from "node:test";
import assert from "node:assert/strict";
import { extractPlainText, pickBodyText } from "../src/body.js";

const fakeConvert = async (html) => `converted:${html.replace(/<[^>]+>/g, "")}`;

test("pickBodyText prefers text/plain over text/html", async () => {
    const parts = [
        { contentType: "text/html", content: "<p>Hello</p>" },
        { contentType: "text/plain", content: "Hello\n" }
    ];
    assert.equal(await pickBodyText(parts, fakeConvert), "Hello");
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
