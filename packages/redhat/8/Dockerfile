# Equal to centos:8.2.2004
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=4062bbdd1bb0801b0aa38e0f83dece70fb7a5e9bce223423a68de2d8b784b43b
ARG BUILD_IMAGE=docker.io/centos
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

RUN useradd -m build

ARG SALT_VERSION
ADD common/yum_repositories/*.repo /etc/yum.repos.d/
RUN sed -i s/@SALT_VERSION@/$SALT_VERSION/ /etc/yum.repos.d/saltstack.repo

ENV GOPATH=/go

RUN dnf install -y --setopt=skip_missing_names_on_install=False \
        createrepo \
        epel-release \
        python36 \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yum-utils \
        git \
        golang \
        libseccomp-devel \
        && \
    dnf clean all && \
    go get github.com/cpuguy83/go-md2man && \
    ln -s $GOPATH/bin/go-md2man /usr/local/bin/go-md2man
