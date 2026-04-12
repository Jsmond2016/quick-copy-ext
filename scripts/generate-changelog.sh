#!/bin/bash

set -e

print_info() {
  echo "[INFO] $1"
}

print_success() {
  echo "[OK] $1"
}

generate_changelog() {
  local version=$1
  local previous_tag=$2

  if [ -z "$previous_tag" ]; then
    commits=$(git log --pretty=format:"- %s" --no-merges)
  else
    commits=$(git log "$previous_tag"..HEAD --pretty=format:"- %s" --no-merges)
  fi

  features=$(echo "$commits" | grep "^- feat" || true)
  fixes=$(echo "$commits" | grep "^- fix" || true)
  chores=$(echo "$commits" | grep "^- chore" || true)
  docs=$(echo "$commits" | grep "^- docs" || true)
  others=$(echo "$commits" | grep -v "^- feat\|^- fix\|^- chore\|^- docs" || true)

  if [ -n "$features" ]; then
    echo "### Features"
    echo "$features"
    echo
  fi

  if [ -n "$fixes" ]; then
    echo "### Bug Fixes"
    echo "$fixes"
    echo
  fi

  if [ -n "$chores" ]; then
    echo "### Maintenance"
    echo "$chores"
    echo
  fi

  if [ -n "$docs" ]; then
    echo "### Documentation"
    echo "$docs"
    echo
  fi

  if [ -n "$others" ]; then
    echo "### Other Changes"
    echo "$others"
    echo
  fi
}

update_changelog_file() {
  local version=$1
  local content=$2
  local current_date
  current_date=$(date +%F)

  if [ ! -f CHANGELOG.md ]; then
    cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
EOF
  fi

  {
    head -n 7 CHANGELOG.md
    echo "## [$version] - $current_date"
    echo
    echo "$content"
    tail -n +8 CHANGELOG.md
  } > CHANGELOG.md.tmp

  mv CHANGELOG.md.tmp CHANGELOG.md
  print_success "CHANGELOG.md updated"
}

main() {
  version=${1:-$(node -p "require('./package.json').version")}
  previous_tag=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")

  print_info "Generating changelog for version: $version"
  changelog_content=$(generate_changelog "$version" "$previous_tag")
  echo "$changelog_content"

  if [ "$2" = "--update" ] || [ "$2" = "-u" ]; then
    update_changelog_file "$version" "$changelog_content"
  fi
}

main "$@"
