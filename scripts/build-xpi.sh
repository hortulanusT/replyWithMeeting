#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"

cd "${ROOT_DIR}"
mkdir -p "${DIST_DIR}"

VERSION=$(node -p "require('./manifest.json').version")
if [[ -z "${VERSION}" || "${VERSION}" == "undefined" ]]; then
  echo "manifest.json has no version field" >&2
  exit 1
fi

OUT_FILE="${DIST_DIR}/reply-with-meeting-${VERSION}.xpi"

# zip updates an existing archive in place, which would keep files that were
# removed from the source tree. Always start from a fresh archive.
rm -f "${OUT_FILE}"

zip -r "${OUT_FILE}" \
  manifest.json \
  src \
  experiments \
  _locales \
  icons \
  LICENSE \
  THIRD_PARTY_NOTICES.md \
  README.md \
  CHANGELOG.md \
  -x "*.DS_Store" >/dev/null

echo "Created ${OUT_FILE}"
