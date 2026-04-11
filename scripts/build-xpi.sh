#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
mkdir -p "${DIST_DIR}"

VERSION=$(node -p "require('./manifest.json').version" 2>/dev/null || true)
if [[ -z "${VERSION}" ]]; then
  VERSION="dev"
fi

OUT_FILE="${DIST_DIR}/reply-with-meeting-${VERSION}.xpi"

cd "${ROOT_DIR}"
zip -r "${OUT_FILE}" \
  manifest.json \
  src \
  icons \
  -x "*.DS_Store" "*/.git/*" "test/*" "dist/*" "web-ext-artifacts/*" >/dev/null

echo "Created ${OUT_FILE}"
