#!/bin/bash

set -e

VERSION_TYPE=${1:-patch}

if [ -z "$VERSION_TYPE" ]; then
  echo "Usage: $0 <patch|minor|major>"
  exit 1
fi

NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version)
VERSION_NUMBER=$(echo "$NEW_VERSION" | sed 's/^v//')

if [ ! -f CHANGELOG.md ]; then
  cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
EOF
fi

TEMP_FILE=$(mktemp)
tail -n +8 CHANGELOG.md > "$TEMP_FILE" 2>/dev/null || true

conventional-changelog -p angular -i CHANGELOG.md -s -r 1

if [ -s "$TEMP_FILE" ]; then
  cat "$TEMP_FILE" >> CHANGELOG.md
fi
rm -f "$TEMP_FILE"

git add package.json CHANGELOG.md
git commit --no-verify -m "chore(release): $VERSION_NUMBER"

echo "✅ Version bumped to $NEW_VERSION"
