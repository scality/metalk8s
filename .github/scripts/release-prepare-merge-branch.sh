#!/bin/bash
#
# Create the `feature/merge-<TAG>-tag` branch that carries the release
# tag back into the development branch.
#
#   - On GA, bump VERSION_PATCH to open the next patch cycle and let the
#     batched CHANGELOG.md / .changes/<TAG>.md flow back to development.
#   - On alpha/beta, wipe the batched CHANGELOG bits from the merge so the
#     PR has no changelog diff — pre-release entries live on the tag only.
#   - Always reset VERSION_SUFFIX to "-dev".
#
# Inputs (env):
#   RELEASE_TAG    the tag just pushed to origin
#   PATCH_VERSION  integer PATCH of the release (before the +1 bump)
#   SHORT_VERSION  MAJOR.MINOR — target development branch is development/<SHORT_VERSION>
#   VERSION_TYPE   one of "alpha", "beta", "GA" (only GA bumps PATCH and
#                  propagates the CHANGELOG)
#
# Requires: git, sed.

set -euo pipefail

git checkout -b "feature/merge-${RELEASE_TAG}-tag" "origin/development/${SHORT_VERSION}"
git merge "$RELEASE_TAG" --no-ff

if [ "$VERSION_TYPE" != "GA" ]; then
  # Strip the batched CHANGELOG bits pulled in by the merge so the PR has
  # no changelog diff against development. Mirrors the VERSION_SUFFIX reset
  # below: pre-release changelog entries live on the tag only.
  git rm -rf --ignore-unmatch .changes CHANGELOG.md
  git checkout "origin/development/${SHORT_VERSION}" -- .changes CHANGELOG.md
fi

VERSION_PATCH="$PATCH_VERSION"
if [ "$VERSION_TYPE" == "GA" ]; then
  VERSION_PATCH=$((VERSION_PATCH + 1))
  sed -i "s/VERSION_PATCH=.*/VERSION_PATCH=$VERSION_PATCH/" VERSION
fi

sed -i "s/VERSION_SUFFIX=.*/VERSION_SUFFIX=-dev/" VERSION

git add VERSION
git commit --amend --no-edit
git push --set-upstream origin "feature/merge-${RELEASE_TAG}-tag"
