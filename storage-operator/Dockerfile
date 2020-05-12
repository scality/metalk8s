FROM golang:1.13-alpine

ARG OPERATOR_SDK_VERSION=v0.14.1

# Download & install Operator SDK
RUN wget -O /usr/bin/operator-sdk                                         \
     https://github.com/operator-framework/operator-sdk/releases/download/${OPERATOR_SDK_VERSION}/operator-sdk-${OPERATOR_SDK_VERSION}-x86_64-linux-gnu \
    && chmod +x /usr/bin/operator-sdk

# Pre-download the Go dependencies for the storage-operator.
COPY go.mod go.sum /
RUN cd / && go mod download

RUN apk add --no-cache docker

WORKDIR /storage-operator
