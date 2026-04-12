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

npm version "$VERSION" --no-git-tag-version
pnpm run build:chrome
pnpm run build:firefox

git add package.json
git commit -m "chore(release): ${VERSION#v}"
git tag -a "$VERSION" -m "$MESSAGE"

echo "✅ Release commit and tag created: $VERSION"
