# Contributing

## AI-assisted workflow disclosure
- This repository is primarily developed with GitHub Copilot assistance.
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
2. Keep `package.json` version in sync.
3. Run tests and lint.
4. Build XPI: `npm run build:xpi`.
5. Install built XPI on a clean Thunderbird profile and smoke test once.
6. Tag and push release (example: `git tag v0.3.0 && git push origin main --follow-tags`) to publish GitHub release assets.
