# Contributing

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
2. Run tests and lint.
3. Build XPI: `npm run build:xpi`.
4. Install built XPI on a clean Thunderbird profile and smoke test once.
