# SHA256 digest of the base image
ARG BASE_IMAGE_SHA256=5d4f4e6051c7cc10f2e712f9dc3f86a2bd67e457bced7ca52a71c243099c0121
ARG BASE_IMAGE=docker.io/centos

FROM $BASE_IMAGE@sha256:$BASE_IMAGE_SHA256

# Packages to install
ARG PACKAGES=keepalived

# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE=0000-00-00T00:00:00Z
# Git revision of the tree at build time
ARG VCS_REF=0000000000000000000000000000000000000000
# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG VERSION=0000000

ENTRYPOINT ["/usr/sbin/keepalived", "--log-console", "--dont-respawn", "--dont-fork"]

RUN yum install -y $PACKAGES && \
    yum clean all
