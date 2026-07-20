#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

cd "$ROOT_DIR"

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip command is required to package the extensions." >&2
  exit 1
fi

VERSION=$(node -e "const fs = require('fs'); console.log(JSON.parse(fs.readFileSync('package.json', 'utf8')).version || '')")

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
  echo "Error: invalid package version: $VERSION" >&2
  exit 1
fi

CHROME_ZIP="quick-copy-ext_${VERSION}.zip"
FIREFOX_ZIP="quick-copy-ext_firefox_${VERSION}.zip"

rm -f "$CHROME_ZIP" "$FIREFOX_ZIP"

echo "Building Chrome extension..."
pnpm run build:chrome

echo "Building Firefox extension..."
pnpm run build:firefox

echo "Packaging Chrome extension..."
(cd dist_chrome && zip -qr "../$CHROME_ZIP" .)

echo "Packaging Firefox extension..."
(cd dist_firefox && zip -qr "../$FIREFOX_ZIP" .)

echo
echo "Packages created:"
echo "  $ROOT_DIR/$CHROME_ZIP"
echo "  $ROOT_DIR/$FIREFOX_ZIP"
