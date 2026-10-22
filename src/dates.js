// Default meeting slot: tomorrow 09:00-10:00 in local time.
export function createMeetingWindow(now = new Date()) {
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start, end };
}

// Formats a Date as "YYYY-MM-DDTHH:MM:SS" in local time without a zone suffix;
// the experiment interprets it in the user's calendar timezone.
export function toLocalIsoNoTimezone(date) {
    const pad = (value) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Converts a message date (Date, string or number) to epoch milliseconds,
// falling back to `now` for missing or unparsable values.
export function toEpochMs(value, now = Date.now()) {
    if (!value) {
        return now;
    }
    if (value instanceof Date) {
        const time = value.getTime();
        return Number.isNaN(time) ? now : time;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? now : parsed;
}
