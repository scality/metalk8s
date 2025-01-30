ARG BUILDER_IMG=alpine:latest
FROM ${BUILDER_IMG} AS builder

# Copy files to locations specified by labels.
COPY bundle/manifests /manifests/
COPY bundle/metadata /metadata/
COPY bundle/tests/scorecard /tests/scorecard/

# Replace MK8S_VERSION_STUB with the actual version.
ARG METALK8S_VERSION=MK8S_VERSION_STUB
RUN sed -i "s/MK8S_VERSION_STUB/${METALK8S_VERSION}/g" /manifests/nginx-operator.clusterserviceversion.yaml

FROM scratch

# Core bundle labels.
LABEL operators.operatorframework.io.bundle.mediatype.v1=registry+v1
LABEL operators.operatorframework.io.bundle.manifests.v1=manifests/
LABEL operators.operatorframework.io.bundle.metadata.v1=metadata/
LABEL operators.operatorframework.io.bundle.package.v1=nginx-operator
LABEL operators.operatorframework.io.bundle.channels.v1=alpha
LABEL operators.operatorframework.io.metrics.builder=operator-sdk-v1.39.1
LABEL operators.operatorframework.io.metrics.mediatype.v1=metrics+v1
LABEL operators.operatorframework.io.metrics.project_layout=helm.sdk.operatorframework.io/v1

# Labels for testing.
LABEL operators.operatorframework.io.test.mediatype.v1=scorecard+v1
LABEL operators.operatorframework.io.test.config.v1=tests/scorecard/

# Copy files from builder to locations specified by labels.
COPY --from=builder /manifests /manifests/
COPY --from=builder /metadata /metadata/
COPY --from=builder /tests/scorecard /tests/scorecard/
