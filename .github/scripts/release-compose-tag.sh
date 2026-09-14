#!/bin/bash
#
# Compose the release tag and expose the derived version values to
# subsequent workflow steps via $GITHUB_ENV.
#
# Inputs (env):
#   VERSION_TYPE  one of "alpha", "beta", "GA"
#
# Outputs ($GITHUB_ENV):
#   SHORT_VERSION   MAJOR.MINOR
#   PATCH_VERSION   PATCH
#   BASE_VERSION    MAJOR.MINOR.PATCH
#   RELEASE_TAG     the tag we are about to create
#   RELEASE_BRANCH  release/<RELEASE_TAG>
#
# Requires: ./semver (in $PWD), git.

set -euo pipefail

# shellcheck disable=SC1091
source VERSION

SHORT_VERSION="$VERSION_MAJOR.$VERSION_MINOR"
BASE_VERSION="$SHORT_VERSION.$VERSION_PATCH"
TAG="$BASE_VERSION"

if [ "$VERSION_TYPE" == "alpha" ] || [ "$VERSION_TYPE" == "beta" ]; then
  TAG="$TAG-$VERSION_TYPE"
  TAG_QUERY="$TAG*"
elif [ "$VERSION_TYPE" == "GA" ]; then
  TAG_QUERY="$TAG"
else
  echo "Invalid release type: $VERSION_TYPE"
  exit 1
fi

LAST_MATCH_TAG=$(git tag -l --sort=-v:refname "$TAG_QUERY" | head -n 1)

if [ "$VERSION_TYPE" == "GA" ] && [ "$LAST_MATCH_TAG" != "" ]; then
  echo "Release $LAST_MATCH_TAG already exists"
  exit 1
fi

if [ "$VERSION_TYPE" == "alpha" ] || [ "$VERSION_TYPE" == "beta" ]; then
  SUFFIX_NUMBER="1"

  if [ "$LAST_MATCH_TAG" != "" ]; then
    SUFFIX_NUMBER=$(./semver get prerel "$LAST_MATCH_TAG" | cut -d'.' -f2)
    SUFFIX_NUMBER=$((SUFFIX_NUMBER + 1))
  fi

  TAG="$TAG.$SUFFIX_NUMBER"
fi

{
  echo "SHORT_VERSION=$SHORT_VERSION"
  echo "PATCH_VERSION=$VERSION_PATCH"
  echo "BASE_VERSION=$BASE_VERSION"
  echo "RELEASE_TAG=$TAG"
  echo "RELEASE_BRANCH=release/$TAG"
} >> "$GITHUB_ENV"
