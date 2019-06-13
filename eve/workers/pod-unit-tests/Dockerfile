FROM centos:7

ARG BUILDBOT_VERSION=0.9.12

ENV LANG=en_US.utf8

WORKDIR /home/eve/workspace

RUN curl -sL https://rpm.nodesource.com/setup_10.x | bash -
RUN yum install -y epel-release \
    && yum install -y gcc \
    make \
    python-devel \
    python-pip \
    python36 \
    python36-devel \
    python36-pip \
    git \
    nodejs \
    && adduser -u 1042 --home /home/eve eve \
    && chown eve:eve /home/eve/workspace \
    && pip install buildbot-worker==${BUILDBOT_VERSION}

USER eve
