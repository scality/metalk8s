# CI lint container - Fedora for recent ShellCheck version
FROM fedora:29

ARG BUILDBOT_VERSION=0.9.12

ENV LANG=en_US.utf8

WORKDIR /home/eve/workspace

RUN dnf install -y git \
  gcc \
  make \
  enchant \
  python2-twisted \
  python \
  python-devel \
  python-pip \
  python3 \
  python3-devel \
  ShellCheck \
  && dnf clean all \
  && adduser -u 1042 --home /home/eve eve \
  && chown eve:eve /home/eve/workspace \
  && pip install tox \
  && pip install buildbot-worker==${BUILDBOT_VERSION}

USER eve
