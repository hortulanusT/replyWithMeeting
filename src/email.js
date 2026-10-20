const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z0-9-]{2,}/i;

function unquote(text) {
    return text.trim().replace(/^"(.*)"$/s, "$1").replace(/\\(.)/g, "$1").trim();
}

// Minimal parser for a single "Name <addr>" mailbox, used when Thunderbird's
// messengerUtilities.parseMailboxString is unavailable. The address inside
// angle brackets wins over address-like text in the display name.
export function parseMailboxFallback(input) {
    if (!input || typeof input !== "string") {
        return null;
    }

    const angle = input.match(/<([^<>]+)>\s*$/);
    if (angle) {
        const email = angle[1].match(EMAIL_PATTERN)?.[0];
        if (!email) {
            return null;
        }
        return { email, name: unquote(input.slice(0, angle.index)) };
    }

    const email = input.match(EMAIL_PATTERN)?.[0];
    return email ? { email, name: "" } : null;
}

// Deduplicates mailboxes by address (case-insensitive), drops the user's own
// addresses and keeps the first non-empty display name seen for each address.
export function collectInvitees(mailboxes, ownEmails = []) {
    const excludedSet = new Set(ownEmails.map((email) => String(email).trim().toLowerCase()));
    const result = new Map();

    for (const mailbox of mailboxes) {
        const email = String(mailbox?.email || "").trim().toLowerCase();
        if (!email || excludedSet.has(email)) {
            continue;
        }

        const name = String(mailbox.name || "").trim();
        const existing = result.get(email);
        if (!existing) {
            result.set(email, { email, name });
        } else if (!existing.name && name) {
            existing.name = name;
        }
    }

    return Array.from(result.values()).sort((a, b) => a.email.localeCompare(b.email));
}

// Reply/forward prefixes used by the supported locales (en, de, nl), optionally
// with a counter such as "Re[2]:" or "AW(3):". Repeated prefixes are all removed.
const REPLY_FORWARD_PREFIX = /^\s*(?:(?:re|aw|antw|wg|fwd?|doorst)\s*(?:\[\d+\]|\(\d+\))?\s*:\s*)+/i;

export function stripReplyPrefixes(subject, noSubject = "(no subject)") {
    if (!subject) {
        return noSubject;
    }

    return subject.replace(REPLY_FORWARD_PREFIX, "").trim() || noSubject;
}
