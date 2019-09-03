# Base image configuration
# SHA256 digest of the image
ARG EXAMPLE_IMAGE_SHA256=6ae4cddb2b37f889afd576a17a5286b311dcbf10a904409670827f6f9b50065e
ARG EXAMPLE_IMAGE=docker.io/centos

FROM ${EXAMPLE_IMAGE}@sha256:${EXAMPLE_IMAGE_SHA256}

RUN yum install -y epel-release && yum update -y && yum clean all

RUN yum install -y \
        python36


# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE
# Git revision of the tree at build time
ARG VCS_REF
# Version of the image
ARG VERSION
# Version of the project
ARG PROJECT_VERSION

WORKDIR /app
COPY __version__.py /app/
RUN sed -i 's/@VERSION@/$VERSION/' __version__.py

# These contain BUILD_DATE so should come 'late' for layer caching
LABEL maintainer="example@solution.com" \
      # http://label-schema.org/rc1/
      org.label-schema.build-date="$BUILD_DATE" \
      org.label-schema.name="example-component" \
      org.label-schema.description="Dummy component to demonstrate MetalK8s Solutions" \
      org.label-schema.url="https://github.com/example/solution/" \
      org.label-schema.vcs-url="https://github.com/example/solution.git" \
      org.label-schema.vcs-ref="$VCS_REF" \
      org.label-schema.vendor="Solution" \
      org.label-schema.version="$VERSION" \
      org.label-schema.schema-version="1.0" \
      org.label-schema.docker.cmd="docker run -listen-address :8080" \
      # https://github.com/opencontainers/image-spec/blob/master/annotations.md
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.authors="example@solution.com" \
      org.opencontainers.image.url="https://github.com/example/solution/" \
      org.opencontainers.image.source="https://github.com/example/solution.git" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.vendor="Solution" \
      org.opencontainers.image.title="example-component" \
      org.opencontainers.image.description="Dummy component to demonstrate MetalK8s Solutions" \
      # https://docs.openshift.org/latest/creating_images/metadata.html
      io.openshift.tags="metalk8s,solution,example" \
      io.k8s.description="Dummy component to demonstrate MetalK8s Solutions" \
      # Various
      com.solution.example.version="$PROJECT_VERSION"

COPY server.py /app/

ENTRYPOINT [ "python3", "/app/server.py" ]
