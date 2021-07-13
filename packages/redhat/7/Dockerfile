# Equal to centos:7.6.1810
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=5d4f4e6051c7cc10f2e712f9dc3f86a2bd67e457bced7ca52a71c243099c0121
ARG BUILD_IMAGE=docker.io/centos
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

ARG SALT_VERSION
ADD common/yum_repositories/*.repo /etc/yum.repos.d/
RUN sed -i s/@SALT_VERSION@/$SALT_VERSION/ /etc/yum.repos.d/saltstack.repo

RUN yum install -y --setopt=skip_missing_names_on_install=False \
        createrepo \
        epel-release \
        python36-rpm \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yum-utils \
        && \
    yum clean all

# To build containerd
RUN yum install -y --setopt=skip_missing_names_on_install=False \
        golang \
        btrfs-progs-devel \
        go-md2man \
        libseccomp-devel \
        systemd \
        && \
    yum clean all

# Workaround to avoid metalink error
# `[Errno -1] repomd.xml does not match metalink for epel-source`
# NOTE: This is only a workaround and will likely need to be removed at
# some point
RUN sed -i -e 's/^#baseurl=/baseurl=/' -e 's/^metalink=/#metalink=/' \
    /etc/yum.repos.d/epel.repo

RUN useradd -m build
