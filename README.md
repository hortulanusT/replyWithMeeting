# Reply with Meeting (Thunderbird Add-on)

Thunderbird MailExtension (Manifest V3) that adds a "Reply with Meeting" button in message view.

## AI-assisted development

This project was developed with substantial assistance from AI coding tools:
GitHub Copilot, and Claude Code (Anthropic) for the review and fixes since
version 0.4.2. Commits created with Claude Code carry a `Co-Authored-By: Claude`
trailer. All generated code and documentation are reviewed and tested by a
human maintainer before release.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
Additional notices are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

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
- Thunderbird 158+ (oldest tested version)
- Node.js 20+
- `zip` command available

Install development dependencies (pinned `web-ext` for linting):
```bash
npm install
```

## 2. Implementation status

Main files:
- `manifest.json`: add-on metadata and permissions
- `src/background.js`: click handlers, message lookup and event payload creation
- `src/email.js`: invitee collection, mailbox parsing fallback and subject prefix stripping
- `src/body.js`: picks the plain-text body (converting HTML-only mail)
- `src/dates.js`: default meeting slot and date formatting helpers
- `src/messages.js`: picks the most recent message of a multi-selection
- `experiments/calendarDialog/schema.json`: experiment API schema exposed to the add-on
- `experiments/calendarDialog/implementation.js`: privileged implementation opening native calendar dialog
- `scripts/`: XPI build, `updates.json` generation, version sync/check and the web-ext lint wrapper
- `test/`: Node unit tests for the pure modules in `src/`

Behavior notes:
- Uses MailExtension APIs plus a Thunderbird experiment API for calendar dialog integration.
  Thunderbird has no built-in calendar WebExtension API yet (bug 1627205), so the
  experiment is required to open the prefilled event editor and to read the
  reply-header preferences.
- Default flow is direct calendar event draft creation in Thunderbird's native dialog.
- If native reply-header formatting is unavailable, a localized fallback header is used.
- Thunderbird controls exact toolbar ordering for extension buttons. The add-on appears in the message toolbar, and also in the message context menu as fallback access.

## 3. Local testing

### Quick validation
```bash
npm test
```

If you get a Node version error, use Node.js 20+ first.

Version source of truth:
- `manifest.json` is the source of truth.
- Sync `package.json` and `package-lock.json` when you change the manifest version
  (`npm test` fails on a mismatch):
```bash
npm run version:sync
```

### WebExtension lint
```bash
npm run lint:webext
```

`lint:webext` runs `web-ext lint` and fails on any error or warning. web-ext lints
against Firefox/AMO rules, so the expected findings for this add-on
(`experiment_apis`, Thunderbird permissions such as `messagesRead`, and the
self-hosted `update_url`) are ignored; see `scripts/lint-webext.mjs`.

### Load temporarily in Thunderbird
1. Open Thunderbird Add-ons Manager.
2. Go to Extensions.
3. Gear icon -> Debug Add-ons.
4. Click Load Temporary Add-on and select `manifest.json`.
5. Open an email and click Reply with Meeting in message display toolbar.
6. Verify Thunderbird Calendar event dialog opens with:
	- attendees from sender + Reply-To + To + Cc with display names (excluding your own identities, no-reply and mailing-list addresses)
	- summary based on subject, with reply/forward prefixes (`Re:`, `AW:`, `Antw:`, …) removed
	- Thunderbird-style reply header plus original message text
	- default time set to the next working day 09:00-10:00 (local time)
7. Optional fallback: right-click a message in the list and choose Reply with Meeting.
   With several messages selected, attendees from all of them are combined.

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
1. Download `reply-with-meeting-<version>.xpi` from the latest
   [GitHub release](https://github.com/hortulanusT/replyWithMeeting/releases/latest).
2. Thunderbird -> Add-ons Manager.
3. Gear icon -> Install Add-on From File.
4. Select the XPI.

### Automatic updates
Since version 0.7.0 the manifest contains an `update_url` pointing to
`https://github.com/hortulanusT/replyWithMeeting/releases/latest/download/updates.json`.
Every release attaches an `updates.json` (generated by
`scripts/build-updates-json.mjs` during `npm run build:xpi`) that points to that
release's XPI, including its SHA-256 hash. Thunderbird checks it about once a day;
Add-ons Manager -> gear icon -> Check for Updates triggers a check immediately.

Notes:
- Versions before 0.7.0 have no `update_url`; install 0.7.0 or later manually once.
- Temporarily loaded add-ons (Debug Add-ons) are never updated.
- "Latest" on GitHub must be the newest version (ensured by `make_latest: legacy`
  in the release workflow), otherwise installs would be offered an older XPI.
- addons.thunderbird.net does not accept `update_url`; remove it from the
  manifest for an ATN upload, where ATN handles updates instead.

### Public internet (later)
Planned future process:
- Harden with additional validation and UX.
- Submit package to addons.thunderbird.net for signing/review.

### Official Thunderbird Add-ons page (ATN) checklist
1. Create/verify your developer account at addons.thunderbird.net.
2. Bump version in [manifest.json](manifest.json), then run `npm run version:sync`.
3. Run `npm test`, `npm run lint:webext`, and `npm run build:xpi`.
4. Validate install + smoke test in a clean Thunderbird profile.
5. Prepare listing metadata (summary, description, screenshots, support URL).
6. Remove `update_url` from the manifest for the ATN build, upload the XPI to ATN and complete policy/license fields.
7. Address reviewer feedback and publish signed version from ATN.

Note: this add-on uses a Thunderbird experiment API. ATN review can require additional scrutiny for privileged APIs.

### GitHub Releases: downloadable XPI option
This repository includes a workflow at [.github/workflows/release.yml](.github/workflows/release.yml).

Release flow:
1. Bump version in [manifest.json](manifest.json) and run `npm run version:sync`.
2. Rename the `[Unreleased]` section in [CHANGELOG.md](CHANGELOG.md) to the new version and date.
3. Commit changes on main.
4. Create an annotated semantic version tag matching the manifest version and push it (example: `v0.5.1`).
5. GitHub Actions checks that the tag matches the `manifest.json` version, then builds, tests, lints, and uploads `dist/*.xpi` and `dist/updates.json` to the GitHub Release page.

Every push to `main` and every pull request also runs tests, lint, and an XPI build ([.github/workflows/ci.yml](.github/workflows/ci.yml)); the built XPI is attached to the workflow run as an artifact.

Command example:
```bash
git tag -a v0.5.1 -m "Release 0.5.1"
git push origin main v0.5.1
```

Use an annotated tag (`-a`) and push the tag explicitly. `git push --follow-tags` only
pushes annotated tags, so a lightweight `git tag v0.5.1` would never reach GitHub and no
release would be built. Push one release tag at a time: each tag creates its own GitHub
release, and the last one to finish is marked as latest.

## Known limits
- Requires Thunderbird 158 or newer and an experiment API (privileged add-on code).
  No `strict_max_version` is set on purpose: Thunderbird's release channel updates
  monthly, and a maximum version would disable the add-on for everyone until a new
  release. Because the experiment uses Thunderbird internals, a new Thunderbird
  version can still break it; check the Error Console after Thunderbird updates.
- Attendees are taken from sender, Reply-To, To and Cc; Bcc is ignored. No-reply
  addresses (`noreply@`, `do-not-reply@`, …) and the mailing list's own posting
  address (from `List-Post`) are left out.
- Only identities configured in Thunderbird are excluded as "own" addresses.
- "Next working day" is computed in the operating system's timezone; the 09:00 slot
  is then created in Thunderbird's calendar timezone. If the two differ, the day can
  be off around midnight.
- With several messages selected (up to 50), attendees are combined from all of
  them; title, body and reply header come from the most recent one.
- The event description contains the message body, cut after about 4000 characters
  (marked with `[…]`), so long quoted history is shortened but not removed.
