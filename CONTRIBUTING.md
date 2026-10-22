# Contributing

## AI-assisted workflow disclosure
- This repository is primarily developed with AI assistance (GitHub Copilot and Claude Code).
- Commits created with Claude Code carry a `Co-Authored-By: Claude` trailer; keep such attribution when amending or squashing.
- Contributors must review and validate generated code before merging.
- Keep user-facing language and legal text consistent with [README.md](README.md), [LICENSE](LICENSE), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Development loop
1. Edit source under `src/` and `experiments/`.
2. Update `_locales/*/messages.json` for any new user-facing string.
3. Run `npm test`.
4. Run `npm run lint:webext`.
5. Load temporarily in Thunderbird and test manually.

## Debugging
- In Thunderbird Add-ons Manager Debug Add-ons view, click Inspect for this add-on.
- Use Console with Persist Logs enabled.

## Release checklist
1. Update `manifest.json` version.
2. Run `npm run version:sync` (updates `package.json` and `package-lock.json`).
3. Rename `[Unreleased]` in `CHANGELOG.md` to the new version and today's date.
4. Run tests and lint.
5. Build XPI: `npm run build:xpi`.
6. Install built XPI on a clean Thunderbird profile and smoke test once.
7. Create an annotated tag and push it explicitly to publish GitHub release assets
   (example: `git tag -a v0.5.1 -m "Release 0.5.1" && git push origin main v0.5.1`).
   A lightweight tag is not pushed by `--follow-tags`, so no release would be built.
