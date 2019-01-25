# Equal to centos:7.6.1810
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=5d4f4e6051c7cc10f2e712f9dc3f86a2bd67e457bced7ca52a71c243099c0121
ARG BUILD_IMAGE=docker.io/centos

FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

## Argument to pass through --build-arg, sorted alphabetically

# Name of the application to build (e.g CloudServer, s3-data, etc ...)
ARG APP_NAME

# RPM package architecture. e.g: x86_64, noarch
ARG ARCH

# Author of the solution
ARG AUTHOR

# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE 

# Description
ARg DESCRIPTION

# Documentation URL
ARG DOC_URL

# RPM package release tag. e.g: el7.scality
ARG RELEASE

# URL of the website of the application. Might the same as the source URL
ARG URL

# Vendor of the project
ARG VENDOR

# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG VERSION

# Git revision of the tree at build time
ARG VCS_REF

# URL of the repository hosting the application
# e.g https://scality.github.com/Zenko
ARG VCS_URL

# These contain BUILD_DATE so should come 'late' for layer caching
LABEL maintainer="zenko-platform@scality.com" \
      # http://label-schema.org/rc1/
      org.label-schema.build-date="${BUILD_DATE}" \
      org.label-schema.url="${URL}" \
      org.label-schema.vcs-url="${VCS_URL}" \
      org.label-schema.version="${VERSION}" \
      org.label-schema.vcs-ref="${VCS_REF}" \
      org.label-schema.vendor="${VENDOR}" \
      org.label-schema.name="${APP_NAME}" \
      org.label-schema.description="${DESCRIPTION}" \
      org.label-schema.usage="${DOC_URL}" \
      org.label-schema.schema-version="1.0" \
      org.label-schema.docker.cmd="" \
      org.label-schema.docker.cmd.debug="" \
      org.label-schema.docker.cmd.test="" \
      org.label-schema.docker.params="" \
      # https://github.com/opencontainers/image-spec/blob/master/annotations.md
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.url="${URL}" \
      org.opencontainers.image.source="${VCS_URL}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="${VENDOR}" \
      org.opencontainers.image.title="${APP_NAME}" \
      org.opencontainers.image.authors="${AUTHOR}" \
      org.opencontainers.image.description="${DESCRIPTION}" \
      org.opencontainers.image.documentation="${DOC_URL}" \
      org.opencontainers.image.licenses="" \
      # https://docs.openshift.org/latest/creating_images/metadata.html
      io.openshift.tags="" \
      io.k8s.description="" \
      io.openshift.non-scalable="" \
      io.openshift.expose-services="" \
      io.openshift.min-memory="" \
      # Various Scality specifics
      com.scality.application="${APP_NAME}" \
      com.scality.application.version="${VERSION}" \

# Copy the .spec file into the container for rpmbuild
COPY rpm/${APP_NAME}/${APP_NAME}.spec /root/${APP_NAME}.spec

# Copy the sources of the APP_NAME
COPY rpm/${APP_NAME}-${VERSION}.tar.gz \
    /root/rpmbuild/SOURCES/${APP_NAME}-${VERSION}.tar.gz

# Install the build dependencies and run the rpmbuild
RUN yum install -y yum-utils rpm-build \
    && yum-builddep /root/${APP_NAME}.spec \
    && rpmbuild -bb /root/${APP_NAME}.spec


# Equal to centos:7.6.1810
# SHA256 digest of the base image
ARG RUN_IMAGE_SHA256=5d4f4e6051c7cc10f2e712f9dc3f86a2bd67e457bced7ca52a71c243099c0121
ARG RUN_IMAGE=docker.io/centos

FROM ${RUN_IMAGE}@sha256:${RUN_IMAGE_SHA256} as run

## Set the entrypoint if needed
# ENTRYPOINT ["/usr/bin/${APP_NAME}"]

## Set the CMD if needed
# CMD ["/usr/bin/${APP_NAME}", "--help"]
# CMD ["--help"]



COPY --from=build \
    /root/rpmbuild/RPMS/${APP_NAME}-${VERSION}.${RELEASE}.${ARCH}.rpm \
    -D "_name ${APP_NAME_NAME}" \
    -D "_version ${VERSION}" \
    /var/tmp/${APP_NAME}-${VERSION}.${RELEASE}.${ARCH}.rpm

RUN yum localinstall -y /var/tmp/${APP_NAME}-${VERSION}.${RELEASE}.${ARCH}.rpm
