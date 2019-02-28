# CI lint container
FROM centos:7

ARG BUILDBOT_VERSION=0.9.12

WORKDIR /home/eve/workspace

RUN yum install -y epel-release \
  && yum install -y git \
  gcc \
  make \
  python-twisted-core \
  python \
  python-devel \
  python-pip \
  python36 \
  python36-devel \
  ShellCheck \
  && yum clean all \
  && adduser -u 1042 --home /home/eve eve \
  && chown eve:eve /home/eve/workspace \
  && pip install tox \
  && pip install buildbot-worker==${BUILDBOT_VERSION}

USER eve
