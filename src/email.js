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

const NO_REPLY_LOCAL_PART = /^(?:no[-_.]?reply|do[-_.]?not[-_.]?reply|mailer[-_.]?daemon)(?:[-+_.].*)?$/i;

// True for automated sender addresses such as noreply@, no-reply+abc@,
// donotreply@ or mailer-daemon@, which cannot take part in a meeting.
export function isNoReplyAddress(email) {
    const localPart = String(email || "").split("@")[0];
    return NO_REPLY_LOCAL_PART.test(localPart);
}

// Extracts posting addresses from List-Post header values (RFC 2369), e.g.
// "<mailto:team@lists.example.com>"; "NO" (posting not allowed) yields nothing.
export function parseListPostAddresses(headerValues = []) {
    const addresses = [];
    for (const value of headerValues) {
        for (const match of String(value || "").matchAll(/<mailto:([^>?]+)(?:\?[^>]*)?>/gi)) {
            addresses.push(decodeURIComponent(match[1]).trim().toLowerCase());
        }
    }
    return addresses;
}

// Deduplicates mailboxes by address (case-insensitive), drops the user's own
// addresses, no-reply addresses and any extra excluded addresses (e.g. the
// mailing list itself), and keeps the first non-empty display name per address.
export function collectInvitees(mailboxes, ownEmails = [], excludedEmails = []) {
    const excludedSet = new Set(
        [...ownEmails, ...excludedEmails].map((email) => String(email).trim().toLowerCase())
    );
    const result = new Map();

    for (const mailbox of mailboxes) {
        const email = String(mailbox?.email || "").trim().toLowerCase();
        if (!email || excludedSet.has(email) || isNoReplyAddress(email)) {
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
