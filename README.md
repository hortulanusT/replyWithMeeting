# Reply With Meeting (Thunderbird Add-on)

Thunderbird MailExtension (Manifest V3) that adds a "Reply with Meeting" button in message view.

Current implementation:
- Adds a message display action: Reply with Meeting.
- Opens a reply-all compose window for the selected message.
- Prepends a meeting template at the top, leaving quoted thread content below it.
- Builds and attaches a standards-based `.ics` meeting invite using message participants.

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
- `src/background.js`: main click handler and compose orchestration
- `src/email.js`: extract and normalize invitees from message headers
- `src/icsBuilder.js`: RFC 5545 calendar payload generation

Behavior notes:
- Uses standard MailExtension APIs only.
- v1 uses `.ics` attachment rather than direct Thunderbird Calendar write APIs.

## 3. Local testing

### Quick validation
```bash
npm test
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
6. Verify compose window opens with intro text + quoted thread and `meeting-invite.ics` attachment.

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
- No direct event insertion into Thunderbird calendar database.
- Default meeting time is auto-set to tomorrow at the top of the hour for 30 minutes.
