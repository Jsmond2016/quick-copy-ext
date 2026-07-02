#!/bin/bash

set -e

VERSION_TYPE=${1:-patch}

if [ -z "$VERSION_TYPE" ]; then
  echo "Usage: $0 <patch|minor|major>"
  exit 1
fi

NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version)
VERSION_NUMBER=$(echo "$NEW_VERSION" | sed 's/^v//')

# Write release date for display in footer
RELEASE_DATE=$(date +%Y.%m.%d)
node -e "
  const pkg = require('./package.json');
  pkg.releaseDate = '$RELEASE_DATE';
  require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

if [ ! -f CHANGELOG.md ]; then
  cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
EOF
fi

HEADER_FILE=$(mktemp)
BODY_FILE=$(mktemp)
NEW_ENTRY_FILE=$(mktemp)

head -n 7 CHANGELOG.md > "$HEADER_FILE"
tail -n +8 CHANGELOG.md > "$BODY_FILE" 2>/dev/null || true

conventional-changelog -p angular -r 1 > "$NEW_ENTRY_FILE"

{
  cat "$HEADER_FILE"
  echo
  cat "$NEW_ENTRY_FILE"
  cat "$BODY_FILE"
} > CHANGELOG.md

rm -f "$HEADER_FILE" "$BODY_FILE" "$NEW_ENTRY_FILE"

git add package.json CHANGELOG.md
git commit --no-verify -m "chore(release): $VERSION_NUMBER"

echo "✅ Version bumped to $NEW_VERSION"
