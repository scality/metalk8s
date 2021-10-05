FROM centos:7

ARG BUILDBOT_VERSION=2.0.1
ARG POETRY_VERSION=1.1.9
ARG INSTALL_EXTRAS="-E cli"

ENV LANG=en_US.utf8

RUN yum install -y --setopt=skip_missing_names_on_install=False \
    epel-release \
    && yum install -y --setopt=skip_missing_names_on_install=False \
    gcc \
    sudo \
    python36 \
    python36-devel \
    python36-pip \
    git \
    && adduser -u 1042 --home /home/eve eve \
    && chown -R eve:eve /home/eve \
    && python3.6 -m pip install --upgrade pip \
    && python3.6 -m pip install \
       buildbot-worker==${BUILDBOT_VERSION} \
       poetry==${POETRY_VERSION}

# Add eve to sudoers.
RUN echo "eve ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/eve

USER eve

WORKDIR /home/eve/workspace
