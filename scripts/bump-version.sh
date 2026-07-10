#!/bin/bash

set -e

VERSION_TYPE=${1:-patch}

if [ -z "$VERSION_TYPE" ]; then
  echo "Usage: $0 <patch|minor|major>"
  exit 1
fi

# Check if there are new commits since the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
if [ -n "$LATEST_TAG" ]; then
  COMMITS_SINCE_TAG=$(git log "$LATEST_TAG"..HEAD --oneline --no-merges 2>/dev/null | wc -l | tr -d ' ')
  if [ "$COMMITS_SINCE_TAG" -eq 0 ]; then
    echo "⚠️  No new commits since $LATEST_TAG. Nothing to release."
    echo "   Commit some changes first, or bump manually after a new commit."
    exit 1
  fi
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

conventional-changelog -p angular -u > "$NEW_ENTRY_FILE"

{
  cat "$HEADER_FILE"
  echo
  cat "$NEW_ENTRY_FILE"
  cat "$BODY_FILE"
} > CHANGELOG.md

rm -f "$HEADER_FILE" "$BODY_FILE" "$NEW_ENTRY_FILE"

git add package.json CHANGELOG.md
git commit --no-verify -m "chore(release): $VERSION_NUMBER"
git tag -a "v$VERSION_NUMBER" -m "Release $VERSION_NUMBER"

echo "✅ Version bumped to $NEW_VERSION (tagged as v$VERSION_NUMBER)"
