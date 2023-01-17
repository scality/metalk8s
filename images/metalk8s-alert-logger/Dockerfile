ARG BASE_IMAGE=docker.io/alpine

ARG BUILD_IMAGE_NAME=golang
ARG BUILD_IMAGE_TAG=1.17.0-alpine
FROM ${BUILD_IMAGE_NAME}:${BUILD_IMAGE_TAG} AS builder

ENV CGO_ENABLED=0

ARG ALERTMANAGER_VERSION=latest
ARG PKG_PATH=/go/src/metalk8s-alert-logger/

RUN mkdir -p "$PKG_PATH"

COPY main.go go.mod "$PKG_PATH"

WORKDIR "$PKG_PATH"

RUN sed -i "s/@@ALERTMANAGER_VERSION@@/$ALERTMANAGER_VERSION/g" go.mod \
  && go mod tidy -go=1.16 && go mod tidy -go=1.17 \
  && go install

FROM ${BASE_IMAGE}

MAINTAINER moonshot-platform <moonshot-platform@scality.com>

COPY --from=builder /go/bin/ /usr/bin/

EXPOSE 19094

ENTRYPOINT ["metalk8s-alert-logger"]
