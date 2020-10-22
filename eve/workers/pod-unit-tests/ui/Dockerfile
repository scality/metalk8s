FROM centos:7

ARG BUILDBOT_VERSION=0.9.12

ENV LANG=en_US.utf8

WORKDIR /home/eve/workspace

RUN curl -sL https://rpm.nodesource.com/setup_10.x | bash -
RUN yum install -y --setopt=skip_missing_names_on_install=False \
    epel-release \
    && yum install -y --setopt=skip_missing_names_on_install=False \
    gcc \
    sudo \
    python-devel \
    python-pip \
    git \
    nodejs \
    alsa-lib \
    gtk3 \
    libXtst \
    libXScrnSaver \
    xorg-x11-server-Xvfb \
    && adduser -u 1042 --home /home/eve eve \
    && chown -R eve:eve /home/eve \
    && pip install buildbot-worker==${BUILDBOT_VERSION}

# Add eve to sudoers.
RUN echo "eve ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/eve

USER eve

# Installing dependencies to generate a re-usable cache under /home/eve/.npm
WORKDIR /tmp
COPY package.json package-lock.json ./
RUN npm ci

WORKDIR /home/eve/workspace/
