#!/bin/bash
#
# Pre-create the waterfall integration branches
# (`w/N'.M'/feature/merge-<TAG>-tag`) with the right fixes already applied
# so Bert-E can pick them up and open the corresponding pull requests.
#
# For each `development/N'.M'` strictly higher than the current release:
#   1. Branch off `origin/development/N'.M'`.
#   2. Merge the previous stage (release-merge branch at the first hop,
#      previously-created w/* branch after) with --no-commit.
#   3. Reset VERSION to the target branch's exact state — the release's
#      VERSION_PATCH bump must not propagate upward.
#   4. Regenerate CHANGELOG.md via `changie merge` — absorbs the release's
#      new .changes/*.md entry alongside the target branch's own entries.
#   5. Abort if anything else is still unresolved (any *U*/*A*/*D* code).
#   6. Commit and push the branch.
#
# This step is invoked only for GA releases (guarded at the workflow
# level via `if: inputs.version-type == 'GA'`).
#
# Inputs (env):
#   RELEASE_TAG    the tag just pushed to origin
#   SHORT_VERSION  MAJOR.MINOR of the release being cut
#
# Requires: git, changie, ./semver (fsaintjacques/semver-tool, installed
# earlier in the workflow).

set -euo pipefail

# Returns 0 (true) if the MAJOR.MINOR passed as $1 is strictly greater
# than the release currently being cut. `./semver compare` returns
# 1 / 0 / -1 (higher / equal / lower) but requires MAJOR.MINOR.PATCH,
# so we pad both sides with `.0`.
is_higher_than_release() {
  [ "$(./semver compare "${1}.0" "${SHORT_VERSION}.0")" = "1" ]
}

# List every `origin/development/MAJOR.MINOR` remote branch and strip the
# prefix so we only have the version. Sort ascending (numerically on
# MAJOR then MINOR) so we cascade in the same order Bert-E would.
all_dev_versions=$(git branch -r --list 'origin/development/*.*' \
  | sed 's|.*origin/development/||' \
  | sort -t. -k1,1n -k2,2n)

# Keep only versions strictly higher than the current release.
higher_branches=""
for version in $all_dev_versions; do
  if is_higher_than_release "$version"; then
    higher_branches="${higher_branches}${version} "
  fi
done
higher_branches=${higher_branches% }

if [ -z "$higher_branches" ]; then
  echo "No higher development branches; nothing to pre-integrate."
  exit 0
fi

echo "Higher development branches to integrate:"
echo "$higher_branches"

prev_branch="feature/merge-${RELEASE_TAG}-tag"

for target in $higher_branches; do
  integration_branch="w/${target}/feature/merge-${RELEASE_TAG}-tag"
  echo "==> Preparing $integration_branch (target: development/$target)"

  git fetch --no-tags origin "development/$target"

  # Start from the target's HEAD; -B recreates if a stale local branch is
  # around (retry-safe).
  git checkout -B "$integration_branch" "origin/development/$target"

  # Attempt the merge without committing. Conflicts on VERSION /
  # CHANGELOG.md / .changes/ are expected and will be resolved below;
  # any other conflict is bounced to a human.
  git merge --no-commit --no-ff "$prev_branch" || true

  # Fix 1: pin VERSION to the target branch's exact state so the release's
  # VERSION_PATCH bump does not propagate up.
  git checkout "origin/development/$target" -- VERSION
  git add VERSION

  # Fix 2: regenerate CHANGELOG.md from all `.changes/*.md` files present
  # in the merged tree. This absorbs the release's new `.changes/<TAG>.md`
  # file alongside the target branch's own release entries, avoiding the
  # header conflict.
  changie merge
  git add CHANGELOG.md .changes

  # If anything else is still unresolved (any *U* / *A* / *D* status code),
  # bail out and let a human resolve it — do not push a broken integration
  # branch that Bert-E would pick up.
  if git status --porcelain | grep -qE '^(UU|AA|DD|AU|UA|DU|UD) '; then
    echo "ERROR: Unresolved conflicts on $integration_branch outside VERSION/CHANGELOG:"
    git status --porcelain | grep -E '^(UU|AA|DD|AU|UA|DU|UD) '
    exit 1
  fi

  git commit -m "Merge branch '$prev_branch' into $integration_branch"
  git push --set-upstream origin "$integration_branch"

  prev_branch="$integration_branch"
done
