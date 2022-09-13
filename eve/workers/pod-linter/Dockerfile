# CI lint container - Fedora for recent ShellCheck version
FROM fedora:36

ARG BUILDBOT_VERSION=2.0.1
ARG GO_VERSION=1.17.5
ARG OPERATOR_SDK_VERSION=v0.17.0
ARG HELM_VERSION=3.9.4

ENV LANG=en_US.utf8

WORKDIR /home/eve/workspace

RUN dnf install -y git \
  sudo \
  gcc \
  make \
  enchant \
  hg \
  python3-twisted \
  python \
  python-devel \
  python-pip \
  python3 \
  python3-devel \
  python3-pip \
  python36 \
  ShellCheck \
  && dnf clean all \
  && adduser -u 1042 --home /home/eve eve \
  && chown -R eve:eve /home/eve \
  && pip3 install tox \
  && pip3 install buildbot-worker==${BUILDBOT_VERSION}

# Install helm
RUN curl -ORL https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz \
  && tar xzvf helm-v${HELM_VERSION}-linux-amd64.tar.gz \
  && mv linux-amd64/helm /usr/bin/helm \
  && rm -rf helm-v${HELM_VERSION}-linux-amd64.tar.gz linux-amd64

# Add eve to sudoers.
RUN echo "eve ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/eve

# Install Go tooling to lint the Kubernetes Operators.
ENV GOROOT /usr/local/go
ENV GOPATH /home/eve/.golang
ENV GOCACHE /home/eve/.cache
ENV PATH $GOPATH/bin:$GOROOT/bin:$PATH

RUN curl -ORL https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz      \
    && tar xzvf go${GO_VERSION}.linux-amd64.tar.gz                             \
    && rm go${GO_VERSION}.linux-amd64.tar.gz                                   \
    && mv go /usr/local                                                        \
    && curl -RLo /usr/bin/operator-sdk                                         \
        https://github.com/operator-framework/operator-sdk/releases/download/${OPERATOR_SDK_VERSION}/operator-sdk-${OPERATOR_SDK_VERSION}-x86_64-linux-gnu \
    && chmod +x /usr/bin/operator-sdk

USER eve

# Pre-download the Go dependencies.
COPY go.mod go.sum ./
RUN go mod download
