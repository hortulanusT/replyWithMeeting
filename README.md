# Reply With Meeting (Thunderbird Add-on)

Thunderbird MailExtension (Manifest V3) that adds a "Reply with Meeting" button in message view.

Current implementation:
- Adds a message display action: Reply with Meeting.
- Opens Thunderbird's native calendar event editor dialog.
- Pre-fills summary, description, attendees, and default start/end time.
- Uses a Thunderbird experiment API (`calendarDialog`) to integrate directly with the built-in Calendar.
- Localizes add-on labels/messages via `_locales` (currently en-US, de, nl).

Default behavior:
- The add-on creates a new calendar event draft directly in Thunderbird Calendar.
- Event description starts with a Thunderbird-style reply header followed by the original plain-text body.

## 1. Repository setup

Prerequisites:
- Thunderbird 149+
- Node.js 20+
- `zip` command available

Install project dependencies (none required right now):
```bash
npm install
```

## 2. Implementation status

Main files:
- `manifest.json`: add-on metadata and permissions
- `src/background.js`: main click handler and event payload creation
- `src/email.js`: extract and normalize invitees from message headers
- `experiments/calendarDialog/schema.json`: experiment API schema exposed to the add-on
- `experiments/calendarDialog/implementation.js`: privileged implementation opening native calendar dialog

Behavior notes:
- Uses MailExtension APIs plus a Thunderbird experiment API for calendar dialog integration.
- Default flow is direct calendar event draft creation in Thunderbird's native dialog.
- If native reply-header formatting is unavailable, a localized fallback header is used.
- Thunderbird controls exact toolbar ordering for extension buttons. The add-on appears in the message toolbar, and also in the message context menu as fallback access.

## 3. Local testing

### Quick validation
```bash
npm test
```

If you get `node: bad option: --test` or a Node version error, switch to Node 20 first:
```bash
nvm use
# or, if Node 20 is not installed yet:
# nvm install 20 && nvm use 20
```

### WebExtension lint/build
```bash
npm run lint:webext
npm run build:webext
```

### Load temporarily in Thunderbird
1. Open Thunderbird Add-ons Manager.
2. Go to Extensions.
3. Gear icon -> Debug Add-ons.
4. Click Load Temporary Add-on and select `manifest.json`.
5. Open an email and click Reply with Meeting in message display toolbar.
6. Verify Thunderbird Calendar event dialog opens with:
	- attendees from sender + To + Cc (excluding your own identity)
	- summary based on subject
	- Thunderbird-style reply header plus original message text
	- default time set to tomorrow 09:00-10:00 (local time)
7. Optional fallback: right-click a message in the list and choose Reply with Meeting.

### Localization smoke check
1. Switch Thunderbird UI language to German or Dutch.
2. Reload the add-on.
3. Confirm action title and notification texts are localized.

## 4. Distribution

### Internal colleagues (current target)
Build an XPI:
```bash
npm run build:xpi
```

Artifact path:
- `dist/reply-with-meeting-<version>.xpi`

Install on colleague machines:
1. Thunderbird -> Add-ons Manager.
2. Gear icon -> Install Add-on From File.
3. Select the XPI.

### Public internet (later)
Planned future process:
- Harden with additional validation and UX.
- Submit package to addons.thunderbird.net for signing/review.

## Known limits (v1)
- Meeting attendees are inferred from sender + To + Cc of the current message.
- Requires Thunderbird's built-in Calendar support and experiment API permissions.
