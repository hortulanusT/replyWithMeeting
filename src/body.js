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

// Picks the message body from messages.listInlineTextParts() results:
// text/plain first, otherwise text/html converted to plain text via the
// injected converter. Other text/* parts (e.g. text/calendar) are ignored.
export async function pickBodyText(parts, convertHtmlToPlainText) {
    const textParts = (parts ?? []).filter((part) => String(part?.content || "").trim());

    const plain = textParts.find((part) => baseContentType(part.contentType) === "text/plain");
    if (plain) {
        return plain.content.trim();
    }

    const html = textParts.find((part) => baseContentType(part.contentType) === "text/html");
    if (html) {
        return String(await convertHtmlToPlainText(html.content) || "").trim();
    }

    return "";
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
