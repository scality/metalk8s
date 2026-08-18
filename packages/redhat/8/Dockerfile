# Equal to rockylinux:8.10
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=e8a49c5403b687db05d4d67333fa45808fbe74f36e683cec7abb1f7d0f2338c6
ARG BUILD_IMAGE=docker.io/rockylinux/rockylinux
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

RUN useradd -m build

ARG K8S_SHORT_VERSION

ADD common/yum_repositories/*.repo /etc/yum.repos.d/
RUN sed -i s/@K8S_SHORT_VERSION@/$K8S_SHORT_VERSION/ /etc/yum.repos.d/kubernetes.repo

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
