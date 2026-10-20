# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Fixed
- Meeting title strips repeated and localized reply/forward prefixes (`Re:`, `AW:`, `Antw:`, `WG:`, `Fwd:`, `FW:`, `Doorst:`, including counters like `Re[2]:`), not just a single `Re:`.
- Attendees keep their display names, and addresses are parsed with Thunderbird's RFC 5322 parser, so `"old@x.com" <new@y.com>` or `"Doe, John" <john@…>` resolve to the right address.
- HTML-only messages (common from Outlook) now get their body converted to plain text instead of only "Proposed from: …", and text files attached to a message are no longer used as the body.
- Save failures are now reported when Thunderbird's asynchronous save transaction fails, not only on synchronous errors.
- The event editor opens in a tab when Thunderbird is set to edit events in a tab (`calendar.item.editInTab`).

### Changed
- `npm run lint:webext` now fails on real findings (previously `|| true`), also lints `experiments/`, and uses a pinned `web-ext` devDependency; only expected Thunderbird-specific findings are ignored.
- New CI workflow runs tests, lint and an XPI build on pushes to `main` and on pull requests.
- Release workflow only runs for `v*` tags, verifies the tag matches the manifest version, uses `npm ci`, and runs on Node.js 24 with current action versions.

## [0.4.2] - 2026-10-20

### Fixed
- Reply header now reads Thunderbird's localized reply-header prefs (respecting `mailnews.reply_header_type` and user customizations); if unavailable, the add-on's localized fallback is used instead of a hardcoded English string.
- Events are created in the user's default timezone instead of floating time, so invitations show the correct time for attendees in other timezones.
- Attendee RSVP is set as `"TRUE"` (string) as expected by `calIAttendee`.
- Missing writable calendar is reported before the dialog opens; save failures and unsent invitations are shown to the user instead of only being logged.
- Thunderbird 158: timezone, date-time and calendar lookups now go through the window's `cal` helpers, since `getService()` on the calendar timezone service and calendar manager fails there.
- Message-list context menu is created on install/startup instead of on every background wake, avoiding duplicate-id errors.
- Experiment invalidates Thunderbird's startup cache on disable/update/reload so new experiment code is actually loaded.
- `build-xpi.sh` always creates a fresh archive (files removed from the source no longer linger) and reads the version correctly when run from any directory.

### Changed
- Raised minimum Thunderbird version from 115.0 to 158.0 (oldest tested version; 0.4.1 calendar lookups did not work on 158).
- The event is created in the calendar currently selected in Thunderbird's calendar view, falling back to the first writable calendar that supports events.

## [0.4.1] - 2026-04-18

### Fixed
- Wired the native calendar dialog save callback so Save and Close and Save and Send persist events correctly.
- Removed a null onOk handler path that caused "window.onAcceptCallback is not a function" in the Thunderbird event editor.

## [0.4.0] - 2026-04-18

### Fixed
- Allow empty participant lists to serve as personal meeting reminders (user's own email is excluded from attendees)
- Calendar dialog now opens for self-sent emails or emails without other recipients

### Changed
- Lowered minimum Thunderbird version from 149.0 to 115.0 (first LTS with Manifest V3 support)
- All required MailExtension APIs are fully supported in Thunderbird 115+

## [0.3.1] - 2026-04-11

Commit range: `647c16d`..`647c16d`
Version bump commit: `647c16d`

### Fixed
- XPI build procedure corrected so release artifacts include all runtime-required folders/files.

### Changed
- Manifest and package versions bumped to 0.3.1.

## [0.3.0] - 2026-04-11

Commit range: `748d4e7`..`050a902`
Version bump commit: `7943d06`
Release tag commit: `050a902`

### Added
- Message-list context menu fallback action for discoverability.
- Theme-aware toolbar icons (light and dark variants).
- MIT licensing and third-party notices files.
- GitHub Actions workflow to build and publish XPI assets on version tags.
- Documentation sections for ATN publication checklist and GitHub Releases distribution.
- Changelog file introduced (`102c781`).

### Changed
- Manifest and package versions bumped to 0.3.0.

### Fixed
- Localized reply-header placeholder expansion (for example #1/#2/#3 templates).

## [0.2.0] - 2026-04-11

Commit range: `c5f8e99`..`588a6bd`
Version bump commit: `588a6bd`

### Added
- Initial localization support and localized manifest labels.
- Experiment API method for native reply-header construction.

### Changed
- Documentation alignment for direct calendar workflow.

## [0.1.0] - 2026-04-11

Commit range: `5fb26bd`..`1919a1e`
Version baseline established in initial scaffold commit `5fb26bd`

### Added
- Initial Thunderbird add-on scaffold, background flow, tests, build scripts, and temporary-load instructions.
- Native Thunderbird calendar dialog workflow using the experiment API.

### Removed
- Legacy ICS generation flow and related tests.
- ICS-oriented documentation references.
