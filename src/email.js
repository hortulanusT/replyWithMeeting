function extractEmailAddress(input) {
    if (!input || typeof input !== "string") {
        return null;
    }

    const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (!match) {
        return null;
    }

    return match[0].trim().toLowerCase();
}

function pushIfEmail(targetSet, value, excludedSet) {
    const email = extractEmailAddress(value);
    if (!email) {
        return;
    }

    if (excludedSet.has(email)) {
        return;
    }

    targetSet.add(email);
}

export function collectInviteeEmails(message, ownEmails = []) {
    const excludedSet = new Set(ownEmails.map((email) => String(email).trim().toLowerCase()));
    const result = new Set();

    pushIfEmail(result, message.author, excludedSet);

    for (const recipient of message.recipients ?? []) {
        pushIfEmail(result, recipient, excludedSet);
    }

    for (const recipient of message.ccList ?? []) {
        pushIfEmail(result, recipient, excludedSet);
    }

    return Array.from(result.values()).sort();
}

export function stripRePrefix(subject) {
    if (!subject) {
        return "(no subject)";
    }

    return subject.replace(/^\s*re:\s*/i, "").trim() || "(no subject)";
}
