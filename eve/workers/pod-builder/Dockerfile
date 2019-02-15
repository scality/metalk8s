FROM centos:7

ARG BUILDBOT_VERSION=0.9.12

WORKDIR /home/eve/workspace

RUN yum install -y epel-release

RUN yum-config-manager \
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
    && chown eve:eve /home/eve/workspace

COPY requirements-eve.txt /tmp/

RUN pip install -r /tmp/requirements-eve.txt \
    && pip install buildbot-worker==${BUILDBOT_VERSION}

USER eve

CMD buildbot-worker create-worker . "$BUILDMASTER:$BUILDMASTER_PORT" "$WORKERNAME" "$WORKERPASS" \
    && buildbot-worker start --nodaemon
