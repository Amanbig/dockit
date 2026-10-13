#!/usr/bin/env bash
set -e

# Dockit Version Bump & Release Tagging Helper Script
# Usage:
#   ./scripts/bump-version.sh <new_version|patch|minor|major> [--tag]
#
# Examples:
#   ./scripts/bump-version.sh patch
#   ./scripts/bump-version.sh 0.2.0 --tag

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT_DIR/internal/version/version.go"
WAILS_FILE="$ROOT_DIR/wails.json"
PKG_FILE="$ROOT_DIR/frontend/package.json"

# 1. Read current version from internal/version/version.go
CURRENT_VER=$(grep -oE 'var Version = "[^"]+"' "$VERSION_FILE" | sed -E 's/var Version = "([^"]+)"/\1/')

if [ -z "$CURRENT_VER" ]; then
  echo "Error: Could not determine current version from $VERSION_FILE"
  exit 1
fi

echo "Current version: $CURRENT_VER"

INPUT_VER="$1"
CREATE_TAG=false

if [ "$2" == "--tag" ] || [ "$1" == "--tag" ]; then
  CREATE_TAG=true
  if [ "$1" == "--tag" ]; then
    INPUT_VER=""
  fi
fi

if [ -z "$INPUT_VER" ]; then
  echo "Usage: $0 <new_version | patch | minor | major> [--tag]"
  exit 1
fi

# Split version into components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VER"

case "$INPUT_VER" in
  patch)
    PATCH=$((PATCH + 1))
    NEW_VER="$MAJOR.$MINOR.$PATCH"
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    NEW_VER="$MAJOR.$MINOR.$PATCH"
    ;;
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    NEW_VER="$MAJOR.$MINOR.$PATCH"
    ;;
  *)
    # Strip any leading 'v'
    NEW_VER="${INPUT_VER#v}"
    if ! [[ "$NEW_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
      echo "Error: Version '$INPUT_VER' is not valid semantic version (e.g. 0.2.0)"
      exit 1
    fi
    ;;
esac

echo "Bumping version: $CURRENT_VER -> $NEW_VER"

# 2. Update internal/version/version.go
sed -i -E "s/var Version = \"[^\"]+\"/var Version = \"$NEW_VER\"/" "$VERSION_FILE"

# 3. Update wails.json
sed -i -E "s/\"productVersion\": \"[^\"]+\"/\"productVersion\": \"$NEW_VER\"/" "$WAILS_FILE"

# 4. Update frontend/package.json
sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$NEW_VER\"/" "$PKG_FILE"

echo "Updated files:"
echo " - $VERSION_FILE"
echo " - $WAILS_FILE"
echo " - $PKG_FILE"

# 5. Git Commit & Tag if requested
if [ "$CREATE_TAG" = true ]; then
  echo "Creating git commit and tag v$NEW_VER..."
  git add "$VERSION_FILE" "$WAILS_FILE" "$PKG_FILE"
  git commit -m "chore(release): bump version to v$NEW_VER"
  git tag "v$NEW_VER"
  echo ""
  echo "Successfully created tag v$NEW_VER!"
  echo "To trigger the automated GitHub Actions build and release, run:"
  echo "  git push origin main --tags"
  echo "  # or:"
  echo "  git push origin v$NEW_VER"
else
  echo ""
  echo "Files updated! When ready, commit and tag with:"
  echo "  git commit -am 'chore(release): bump version to v$NEW_VER'"
  echo "  git tag v$NEW_VER"
  echo "  git push origin v$NEW_VER"
fi
