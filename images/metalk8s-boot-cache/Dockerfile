# Boot cache image: a carrier for container image archives, with no runtime of
# its own. Nodes extract the archives it holds and import them into containerd,
# so that critical images survive the loss of the local image store without
# depending on the registry.
#
# Every variant (control plane, registry, worker) is built from this same
# Dockerfile; what changes is the build context, assembled by the buildchain
# with the archives that variant must cache. See `BOOT_CACHE_VARIANTS` in
# buildchain/buildchain/image.py.
FROM scratch

LABEL maintainer="moonshot-platform@scality.com"

COPY images/ /images/
