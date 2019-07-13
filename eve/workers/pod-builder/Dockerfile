FROM centos:7

ARG BUILDBOT_VERSION=0.9.12
ARG GO_VERSION=1.12.7
ARG OPERATOR_SDK_VERSION=v0.9.0

WORKDIR /home/eve/workspace

RUN yum install -y epel-release \
    && yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo \
    && yum install -y \
    gcc \
    hardlinks \
    make \
    python-devel \
    python-pip \
    python36 \
    python36-devel \
    python36-pip \
    genisoimage \
    git \
    skopeo \
    yum-utils \
    docker-ce-cli-18.09.6 \
    && adduser -u 1042 --home /home/eve eve --groups docker \
    && chown -R eve:eve /home/eve \
    && pip install buildbot-worker==${BUILDBOT_VERSION}

# Install Go tooling to build the Kubernetes Operators.
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
