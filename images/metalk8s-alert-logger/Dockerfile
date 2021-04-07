ARG BUILD_IMAGE_NAME=golang
ARG BUILD_IMAGE_TAG=1.16.0-alpine
ARG RUN_IMAGE_NAME=alpine
ARG RUN_IMAGE_TAG=3.13.2
FROM ${BUILD_IMAGE_NAME}:${BUILD_IMAGE_TAG} AS builder

ENV CGO_ENABLED=0

ARG ALERTMANAGER_VERSION=latest
ARG PKG_PATH=/go/src/metalk8s-alert-logger/

RUN mkdir -p "$PKG_PATH"

COPY main.go go.mod "$PKG_PATH"

WORKDIR "$PKG_PATH"

RUN sed -i "s/@@ALERTMANAGER_VERSION@@/$ALERTMANAGER_VERSION/g" go.mod \
  && go mod tidy \
  && go install

FROM ${RUN_IMAGE_NAME}:${RUN_IMAGE_TAG}

MAINTAINER moonshot-platform <moonshot-platform@scality.com>

COPY --from=builder /go/bin/ /usr/bin/

EXPOSE 19094

ENTRYPOINT ["metalk8s-alert-logger"]
