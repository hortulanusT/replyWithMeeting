function isAttachmentPart(part) {
    if (part.name) {
        return true;
    }
    const disposition = [part.headers?.["content-disposition"] ?? []].flat().join(";");
    return /^\s*attachment\b/i.test(disposition);
}

function baseContentType(contentType) {
    return String(contentType || "").split(";")[0].trim().toLowerCase();
}

// A text/plain alternative shorter than this may be a stub such as
// "Please view this message in an HTML-capable client".
const STUB_PLAIN_TEXT_LENGTH = 200;

// Picks the message body from messages.listInlineTextParts() results:
// text/plain first, otherwise text/html converted to plain text via the
// injected converter. A short text/plain part only wins if the converted HTML
// is not longer. Other text/* parts (e.g. text/calendar) are ignored.
export async function pickBodyText(parts, convertHtmlToPlainText) {
    const textParts = (parts ?? []).filter((part) => String(part?.content || "").trim());

    const plain = textParts.find((part) => baseContentType(part.contentType) === "text/plain");
    const plainText = plain ? plain.content.trim() : "";
    if (plainText.length >= STUB_PLAIN_TEXT_LENGTH) {
        return plainText;
    }

    const html = textParts.find((part) => baseContentType(part.contentType) === "text/html");
    if (html) {
        const htmlText = String(await convertHtmlToPlainText(html.content) || "").trim();
        if (htmlText.length > plainText.length) {
            return htmlText;
        }
    }

    return plainText;
}

// Fallback for a messages.getFull() MessagePart tree: returns the first
// inline text/plain body, skipping text files attached to the message.
export function extractPlainText(part) {
    if (!part || isAttachmentPart(part)) {
        return "";
    }
    if (baseContentType(part.contentType) === "text/plain" && part.body) {
        return part.body.trim();
    }
    for (const sub of part.parts ?? []) {
        const text = extractPlainText(sub);
        if (text) {
            return text;
        }
    }
    return "";
}

export const MAX_DESCRIPTION_BODY_LENGTH = 4000;

// Caps long bodies (e.g. threads with extensive quoted history) so the event
// description stays readable. Cuts at the last line break or space before the
// limit and appends a "[…]" marker.
export function truncateBody(text, maxLength = MAX_DESCRIPTION_BODY_LENGTH) {
    const value = String(text || "");
    if (value.length <= maxLength) {
        return value;
    }

    const slice = value.slice(0, maxLength);
    const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
    const cut = breakAt > maxLength * 0.8 ? slice.slice(0, breakAt) : slice;
    return `${cut.trimEnd()}\n[…]`;
}
