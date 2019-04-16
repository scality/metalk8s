# SHA256 digest of the base image
ARG KEEPALIVED_IMAGE_SHA256
ARG KEEPALIVED_IMAGE=docker.io/centos

FROM $KEEPALIVED_IMAGE@sha256:$KEEPALIVED_IMAGE_SHA256

ARG KEEPALIVED_VERSION

# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE
# Git revision o the tree at build time
ARG VCS_REF
# Version of the image
ARG VERSION
# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG METALK8S_VERSION

# Create user early on, since this can be a shared layer for many versions of this image
RUN useradd \
        --user-group \
        --no-create-home \
        --system \
        keepalived_script

ENTRYPOINT ["/entrypoint.sh"]
CMD ["--dont-fork", "--dont-respawn", "--dump-conf", "--address-monitoring", "--log-console", "--log-detail"]

# The entrypoint script is less likely to change than KEEPALIVED_VERSION
COPY entrypoint.sh /entrypoint.sh

# These contain BUILD_DATE so should come 'late' for layer caching
LABEL maintainer="moonshot-platform@scality.com" \
      # http://label-schema.org/rc1/
      org.label-schema.build-date="$BUILD_DATE" \
      org.label-schema.name="keepalived" \
      org.label-schema.description="Load balancer and high availability service, part of MetalK8s" \
      org.label-schema.license="GPLv2+" \
      org.label-schema.url="https://github.com/scality/metalk8s/" \
      org.label-schema.vcs-url="https://github.com/scality/metalk8s.git" \
      org.label-schema.vcs-ref="$VCS_REF" \
      org.label-schema.vendor="Scality" \
      org.label-schema.version="$VERSION" \
      org.label-schema.schema-version="1.0" \
      org.label-schema.docker.cmd="docker run --net host -v /keepalived.conf:/etc/keepalived/keepalived.conf:ro keepalived:$VERSION" \
      # https://github.com/opencontainers/image-spec/blob/master/annotations.md
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.authors="moonshot-platform@scality.com" \
      org.opencontainers.image.url="https://github.com/scality/metalk8s/" \
      org.opencontainers.image.source="https://github.com/scality/metalk8s.git" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.vendor="Scality" \
      org.opencontainers.image.title="keepalived" \
      org.opencontainers.image.description="Load balancer and high availability service, part of MetalK8s" \
      # https://docs.openshift.org/latest/creating_images/metadata.html
      io.openshift.tags="metalk8s,keepalived,ha" \
      io.k8s.description="Load balancer and high availability service, part of MetalK8s" \
      io.openshift.non-scalable="true" \
      # Various
      com.scality.metalk8s.keepalived.version="$KEEPALIVED_VERSION" \
      com.scality.metalk8s.version="$METALK8S_VERSION"

# Final layer installing keepalived-$KEEPALIVED_VERSION
RUN yum install -y \
        iproute \
        keepalived-${KEEPALIVED_VERSION} \
        && \
    yum clean all
