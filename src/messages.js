import { toEpochMs } from "./dates.js";

// Upper bound for combined messages, so an accidental "select all" in a large
// folder doesn't fetch thousands of messages.
export const MAX_COMBINED_MESSAGES = 50;

// Returns the most recent message (by date) of a selection; it provides the
// meeting title, body and reply header. Ties keep the earlier entry.
export function pickNewestMessage(messages) {
    let newest = null;
    let newestTime = -Infinity;
    for (const message of messages ?? []) {
        const time = toEpochMs(message?.date, -Infinity);
        if (newest === null || time > newestTime) {
            newest = message;
            newestTime = time;
        }
    }
    return newest;
}
