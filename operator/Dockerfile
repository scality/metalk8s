# Build the manager binary
FROM golang:1.18 as builder

WORKDIR /workspace
# Copy the Go Modules manifests
COPY go.mod go.mod
COPY go.sum go.sum
# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download

# Copy the go source
COPY main.go main.go
COPY api/ api/
COPY controllers/ controllers/
COPY pkg/ pkg/
COPY version/ version/

# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG METALK8S_VERSION

# Build
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -o manager -ldflags "-X 'github.com/scality/metalk8s/operator/version.Version=${METALK8S_VERSION}'" main.go

# Use distroless as minimal base image to package the manager binary
# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/manager .
USER 65532:65532

ENTRYPOINT ["/manager"]

# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE
# Git revision o the tree at build time
ARG VCS_REF
# Version of the image
ARG VERSION
# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG METALK8S_VERSION

# These contain BUILD_DATE so should come 'late' for layer caching
LABEL maintainer="squad-metalk8s@scality.com" \
      # http://label-schema.org/rc1/
      org.label-schema.build-date="$BUILD_DATE" \
      org.label-schema.name="metalk8s-operator" \
      org.label-schema.description="Kubernetes Operator for managing MetalK8s cluster config" \
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
      org.opencontainers.image.title="metalk8s-operator" \
      org.opencontainers.image.description="Kubernetes Operator for managing MetalK8s cluster config" \
      # https://docs.openshift.org/latest/creating_images/metadata.html
      io.openshift.tags="metalk8s,operator" \
      io.k8s.description="Kubernetes Operator for managing MetalK8s cluster config" \
      # Various
      com.scality.metalk8s.version="$METALK8S_VERSION"
