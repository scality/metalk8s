# Equal to rockylinux:8.5
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=5fed5497b568bcf7a90a00965987fc099edbcf44b1179a5ef6d4b47758281ca5
ARG BUILD_IMAGE=docker.io/rockylinux
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

RUN useradd -m build

ARG SALT_VERSION
ARG K8S_SHORT_VERSION
ARG GO_VERSION=1.16.14

ADD common/yum_repositories/*.repo /etc/yum.repos.d/
RUN sed -i s/@SALT_VERSION@/$SALT_VERSION/ /etc/yum.repos.d/saltstack.repo
RUN sed -i s/@K8S_SHORT_VERSION@/$K8S_SHORT_VERSION/ /etc/yum.repos.d/kubernetes.repo

ENV GOPATH /go
ENV GOROOT /usr/local/go

RUN dnf install -y --setopt=skip_missing_names_on_install=False \
        createrepo \
        epel-release \
        python36 \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yum-utils \
        git \
        gcc \
        libseccomp-devel \
        && \
    dnf clean all

# To build containerd
RUN curl -ORL https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz \
    && tar xzvf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz \
    && mv go /usr/local \
    && ln -s $GOROOT/bin/go /usr/local/bin/go \
    && ln -s $GOROOT/bin/gofmt /usr/local/bin/gofmt \
    && go get github.com/cpuguy83/go-md2man \
    && ln -s $GOPATH/bin/go-md2man /usr/local/bin/go-md2man
