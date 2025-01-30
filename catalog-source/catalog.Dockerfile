ARG SED_IMG=alpine:latest
ARG BASE_IMG=quay.io/operator-framework/opm:latest

# replace MK8S_VERSION_STUB with the actual version
FROM ${SED_IMG} as sed_step
ARG METALK8S_VERSION
ADD catalog /catalog
RUN find /catalog -type f -exec sed -i "s/MK8S_VERSION_STUB/${METALK8S_VERSION}/g" {} \;

# The builder image is expected to contain
# /bin/opm (with serve subcommand)
FROM ${BASE_IMG} as builder

# Copy FBC root into image at /configs and pre-populate serve cache
COPY --from=sed_step /catalog /configs
RUN ["/bin/opm", "serve", "/configs", "--cache-dir=/tmp/cache", "--cache-only"]

FROM ${BASE_IMG}
# The base image is expected to contain
# /bin/opm (with serve subcommand) and /bin/grpc_health_probe

# Configure the entrypoint and command
ENTRYPOINT ["/bin/opm"]
CMD ["serve", "/configs", "--cache-dir=/tmp/cache"]

COPY --from=builder /configs /configs
COPY --from=builder /tmp/cache /tmp/cache

# Set FBC-specific label for the location of the FBC root directory
# in the image
LABEL operators.operatorframework.io.index.configs.v1=/configs
