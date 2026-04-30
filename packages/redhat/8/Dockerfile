# Equal to rockylinux:8.5
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=5fed5497b568bcf7a90a00965987fc099edbcf44b1179a5ef6d4b47758281ca5
ARG BUILD_IMAGE=docker.io/rockylinux
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

RUN useradd -m build

ARG K8S_SHORT_VERSION
ARG GO_VERSION=1.20.14

ADD common/yum_repositories/*.repo /etc/yum.repos.d/
RUN sed -i s/@K8S_SHORT_VERSION@/$K8S_SHORT_VERSION/ /etc/yum.repos.d/kubernetes.repo

ENV GOPATH /go
ENV GOROOT /usr/local/go

RUN dnf install -y --setopt=skip_missing_names_on_install=False \
        createrepo \
        epel-release \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yum-utils \
        git \
        gcc \
        libseccomp-devel \
        && \
    dnf clean all
