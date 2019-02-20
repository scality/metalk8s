FROM centos:7

ARG BUILDBOT_VERSION=0.9.12

WORKDIR /home/eve/workspace

RUN yum install -y epel-release \
    && yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo \
    && yum install -y \
    gcc \
    make \
    python-devel \
    python-pip \
    genisoimage \
    git \
    yum-utils \
    docker-ce-cli-18.09.2 \
    && adduser -u 1042 --home /home/eve eve --groups docker \
    && chown eve:eve /home/eve/workspace \
    && pip install buildbot-worker==${BUILDBOT_VERSION}

USER eve
