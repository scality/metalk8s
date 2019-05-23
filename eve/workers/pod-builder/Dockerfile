FROM centos:7

ARG BUILDBOT_VERSION=0.9.12

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
    && chown eve:eve /home/eve/workspace \
    && pip install buildbot-worker==${BUILDBOT_VERSION}

USER eve
