# Changelog

All notable changes to this project are documented in this file.

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
