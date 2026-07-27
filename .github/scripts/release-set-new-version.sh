#!/bin/bash
#
# Apply the release version to the working tree on the release branch:
#   - Batch changie into a new release entry named after the full tag
#     (e.g. .changes/133.0.0-alpha.1.md) and merge CHANGELOG.md. This runs
#     for every release type; the entries never propagate back to the
#     development branch on non-GA (see release-prepare-merge-branch.sh).
#   - Rewrite VERSION_SUFFIX in VERSION to match the release tag suffix
#     (empty for GA, "-alpha.N" / "-beta.N" otherwise).
#
# Inputs (env):
#   VERSION_TYPE   one of "alpha", "beta", "GA" (unused today; kept for
#                  future release-type-specific tweaks)
#   RELEASE_TAG    the tag we are cutting (used both as the changie batch
#                  version and to derive VERSION_SUFFIX)
#
# Requires: ./semver, changie, git, sed.

set -euo pipefail

changie batch "$RELEASE_TAG"
changie merge
git add CHANGELOG.md .changes

# NEW_VERSION_SUFFIX can be pre-set by the caller as an escape hatch; if
# not, derive it from the tag's prerelease component.
if [ -z "${NEW_VERSION_SUFFIX:-}" ]; then
  NEW_VERSION_SUFFIX=$(./semver get prerel "$RELEASE_TAG")
  [ -n "$NEW_VERSION_SUFFIX" ] && NEW_VERSION_SUFFIX="-$NEW_VERSION_SUFFIX"
fi

sed -i "s/VERSION_SUFFIX=.*/VERSION_SUFFIX=$NEW_VERSION_SUFFIX/" VERSION

git add VERSION
