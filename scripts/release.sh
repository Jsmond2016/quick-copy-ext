#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <v1.0.0> [message]"
  exit 1
fi

VERSION=$1
MESSAGE=${2:-"Release $VERSION"}

if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
  echo "Invalid version format: $VERSION"
  echo "Expected: v1.0.0"
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  echo "Working directory is not clean. Please commit or stash your changes first."
  exit 1
fi

# Check if there are new commits since the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
if [ -n "$LATEST_TAG" ]; then
  COMMITS_SINCE_TAG=$(git log "$LATEST_TAG"..HEAD --oneline --no-merges 2>/dev/null | wc -l | tr -d ' ')
  if [ "$COMMITS_SINCE_TAG" -eq 0 ]; then
    echo "⚠️  No new commits since $LATEST_TAG. Nothing to release."
    exit 1
  fi
fi

npm version "$VERSION" --no-git-tag-version

# Write release date for display in footer
RELEASE_DATE=$(date +%Y.%m.%d)
node -e "
  const pkg = require('./package.json');
  pkg.releaseDate = '$RELEASE_DATE';
  require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Generate changelog entry for this version
VERSION_NUMBER=${VERSION#v}
if [ -f CHANGELOG.md ]; then
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
fi

pnpm run build:chrome
pnpm run build:firefox

git add package.json CHANGELOG.md
git commit -m "chore(release): $VERSION_NUMBER"
git tag -a "$VERSION" -m "$MESSAGE"

echo "✅ Release commit and tag created: $VERSION"
