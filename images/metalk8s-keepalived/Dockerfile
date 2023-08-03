ARG BASE_IMAGE=docker.io/alpine

# NOTE: We need to build keepalived ourself to enable JSON, so that we can
# use the JSON signal to get the current keepalived status in JSON format
# The keepalived binary from the package is not build with JSON enabled
FROM ${BASE_IMAGE} AS build-step

# Keepalived version to use
ARG KEEPALIVED_VERSION

WORKDIR /home/keepalived

RUN apk add --no-cache make gcc curl autoconf automake musl-dev libnl3-dev libnftnl-dev openssl-dev \
  && curl --fail -Lo keepalived.tar.gz https://github.com/acassen/keepalived/archive/refs/tags/v${KEEPALIVED_VERSION}.tar.gz \
  && tar xvf keepalived.tar.gz && cd "keepalived-${KEEPALIVED_VERSION}" \
  && ./autogen.sh \
  && ./configure --enable-vrrp -enable-sha1 --enable-json \
  && make && cp bin/keepalived /keepalived


FROM ${BASE_IMAGE}

# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE
# Git revision o the tree at build time
ARG VCS_REF
# Version of the image
ARG VERSION
# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG METALK8S_VERSION

RUN addgroup -S keepalived \
  && adduser -D -S -G keepalived keepalived \
  && chown -R keepalived:keepalived /run \
  && mkdir -p /etc/keepalived \
  && chown -R keepalived:keepalived /etc/keepalived

COPY --chown=keepalived:keepalived keepalived.conf.j2 /etc/keepalived/
COPY --chown=keepalived:keepalived check-get.sh /etc/keepalived/

COPY --chown=keepalived:keepalived generate-config.py /
COPY --chown=keepalived:keepalived liveness-probe.sh /
COPY --chown=keepalived:keepalived entrypoint.sh /

COPY --chown=keepalived:keepalived --from=build-step /keepalived /usr/sbin/

RUN apk add --no-cache libcap \
  && setcap     cap_net_admin,cap_net_bind_service,cap_net_raw,cap_setuid,cap_setgid=+ep /usr/sbin/keepalived \
  && setcap -v  cap_net_admin,cap_net_bind_service,cap_net_raw,cap_setuid,cap_setgid=+ep /usr/sbin/keepalived \
  && apk del libcap

RUN apk add --no-cache libnl3 libnftnl bash curl py3-jinja2 py3-yaml py3-netifaces

USER keepalived

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/etc/keepalived/keepalived-input.yaml"]

# These contain BUILD_DATE so should come 'late' for layer caching
LABEL maintainer="squad-metalk8s@scality.com" \
      # http://label-schema.org/rc1/
      org.label-schema.build-date="$BUILD_DATE" \
      org.label-schema.name="metalk8s-keepalived" \
      org.label-schema.description="MetalK8s Keepalived container" \
      org.label-schema.url="https://github.com/scality/metalk8s/" \
      org.label-schema.vcs-url="https://github.com/scality/metalk8s.git" \
      org.label-schema.vcs-ref="$VCS_REF" \
      org.label-schema.vendor="Scality" \
      org.label-schema.version="$VERSION" \
      org.label-schema.schema-version="1.0" \
      # https://github.com/opencontainers/image-spec/blob/master/annotations.md
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.authors="squad-metalk8s@scality.com" \
      org.opencontainers.image.url="https://github.com/scality/metalk8s/" \
      org.opencontainers.image.source="https://github.com/scality/metalk8s.git" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.vendor="Scality" \
      org.opencontainers.image.title="metalk8s-keepalived" \
      org.opencontainers.image.description="MetalK8s Keepalived container" \
      # https://docs.openshift.org/latest/creating_images/metadata.html
      io.openshift.tags="metalk8s,keepalived" \
      io.k8s.description="MetalK8s Keepalived container" \
      # Various
      com.scality.metalk8s.version="$METALK8S_VERSION"
