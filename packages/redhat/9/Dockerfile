# Equal to rockylinux:9.8
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=8101994123cf3d0a8fee517bee7f39e555c7d92bd2d9eb3303cc988a0eeed00f
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
