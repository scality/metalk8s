#!/bin/bash
#
# Build the annotated release tag's message body and push the tag.
#
# The body mentions the embedded Kubernetes version (or, for a patch
# release, points readers to the main .0 release notes) and optionally
# appends the "What's new" bullet list provided at workflow dispatch.
#
# Inputs (env):
#   RELEASE_TAG    the tag being created
#   PATCH_VERSION  integer PATCH; "0" means main release, otherwise patch
#   SHORT_VERSION  MAJOR.MINOR (for the "main release" link on patches)
#   WHAT_IS_NEW    JSON-encoded array of strings; "[]" if empty
#
# Requires: python3 with buildchain importable, jq, git.

set -euo pipefail

BODY=$(mktemp)

K8S_VERSION=$(python3 -c 'from buildchain.buildchain import versions; print(versions.K8S_VERSION)')

PATCH_MSG="MetalK8s $RELEASE_TAG embeds Kubernetes $K8S_VERSION."
if [ "$PATCH_VERSION" != "0" ]; then
  PATCH_MSG="MetalK8s $RELEASE_TAG is a patch release (see [the main release ${SHORT_VERSION}.0](https://github.com/scality/metalk8s/releases/${SHORT_VERSION}.0))."
fi

cat > "$BODY" <<- EOM
MetalK8s $RELEASE_TAG
===

$PATCH_MSG

Useful links
---

- [Documentation](https://metal-k8s.readthedocs.io/en/$RELEASE_TAG)
- [Upgrade notes](https://metal-k8s.readthedocs.io/en/$RELEASE_TAG/operation/upgrade.html)
- [Changelog](https://github.com/scality/metalk8s/blob/$RELEASE_TAG/CHANGELOG.md)

EOM

if [ "$WHAT_IS_NEW" != "[]" ]; then
  {
    echo "What's new"
    echo "==="
    echo ""
  } >> "$BODY"
  while IFS= read -r line; do
    echo "- $line" >> "$BODY"
  done < <(echo "$WHAT_IS_NEW" | jq -r '.[]')
fi

git tag -a "$RELEASE_TAG" -F "$BODY"
git push origin "$RELEASE_TAG"
