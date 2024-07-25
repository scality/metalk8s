# Equal to centos:7.6.1810
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=5d4f4e6051c7cc10f2e712f9dc3f86a2bd67e457bced7ca52a71c243099c0121
ARG BUILD_IMAGE=docker.io/centos
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

ARG SALT_VERSION
ARG K8S_SHORT_VERSION
ARG GO_VERSION=1.17.13

# CentOS 7 is EOL and mirrorlist does no longer exists
# as a temporary workaround (waiting for drop of CentOS 7 support)
# let's use another mirror
RUN sed -i 's/^mirrorlist=/#mirrorlist=/; s/^#baseurl=/baseurl=/; s/mirror\.centos\.org/vault\.centos\.org/' /etc/yum.repos.d/*.repo

ADD common/yum_repositories/*.repo /etc/yum.repos.d/
RUN sed -i s/@SALT_VERSION@/$SALT_VERSION/ /etc/yum.repos.d/saltstack.repo
RUN sed -i s/@K8S_SHORT_VERSION@/$K8S_SHORT_VERSION/ /etc/yum.repos.d/kubernetes.repo

ENV GOROOT /usr/local/go

RUN yum install -y --setopt=skip_missing_names_on_install=False \
        createrepo \
        epel-release \
        python36-rpm \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yum-utils \
        gcc \
        && \
    yum clean all

# To build containerd
RUN yum install -y --setopt=skip_missing_names_on_install=False \
        btrfs-progs-devel \
        go-md2man \
        libseccomp-devel \
        systemd \
        go-srpm-macros \
        && \
    yum clean all

RUN curl -ORL https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz \
    && tar xzvf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz \
    && mv go /usr/local \
    && ln -s $GOROOT/bin/go /usr/local/bin/go \
    && ln -s $GOROOT/bin/gofmt /usr/local/bin/gofmt

RUN useradd -m build
