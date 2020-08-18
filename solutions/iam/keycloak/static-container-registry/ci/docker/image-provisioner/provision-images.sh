#!/bin/bash

set -ue -o pipefail

rm -f /var/lib/images/.pulled

HARDLINK=${HARDLINK:-$(command -v hardlink || echo false)}
SKOPEO=${SKOPEO:-$(command -v skopeo || echo false)}
IMAGES=/var/lib/images

test -d $IMAGES

mkdir -p $IMAGES/alpine $IMAGES/metalk8s-keepalived

$SKOPEO copy --format v2s2 --dest-compress docker://docker.io/alpine:3.9.3 dir:$IMAGES/alpine/3.9.3
$SKOPEO copy --format v2s2 --dest-compress docker://docker.io/alpine:3.9 dir:$IMAGES/alpine/3.9
$SKOPEO copy --format v2s2 --dest-compress docker://docker.io/alpine:3.8.4 dir:$IMAGES/alpine/3.8.4
$SKOPEO copy --format v2s2 --dest-compress docker://docker.io/nicolast/metalk8s-keepalived:latest dir:$IMAGES/metalk8s-keepalived/latest

$HARDLINK -c -vv /var/lib/images

touch /var/lib/images/.pulled
