# Equal to centos:7.6.1810
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=5d4f4e6051c7cc10f2e712f9dc3f86a2bd67e457bced7ca52a71c243099c0121
ARG BUILD_IMAGE=docker.io/centos
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256} as build

ADD yum_repositories/*.repo /etc/yum.repos.d/
ADD https://dl.yarnpkg.com/rpm/yarn.repo /etc/yum.repos.d
ADD NODESOURCE-GPG-SIGNING-KEY-EL /etc/pki/rpm-gpg/
ADD nodesource-el7.repo /etc/yum.repos.d/

RUN yum install -y \
        createrepo \
        epel-release \
        git \
	nodejs \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yarn \
        yum-utils \
        && \
    yum clean all

RUN useradd -m build
