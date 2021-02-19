FROM centos:7

ARG BUILDBOT_VERSION=2.0.1

ENV LANG=en_US.utf8

RUN curl -sL https://rpm.nodesource.com/setup_12.x | bash -
RUN yum install -y --setopt=skip_missing_names_on_install=False \
        epel-release \
    && yum install -y --setopt=skip_missing_names_on_install=False \
        alsa-lib* \
        gcc-c++ \
        GConf2* \
        git \
        gtk3 \
        iproute \
        libXtst* \
        libXScrnSaver* \
        net-tools \
        nodejs \
        python36 \
        python36-devel \
        python36-pip \
        sudo \
        xorg-x11-server-Xvfb

RUN python3.6 -m pip install buildbot-worker==${BUILDBOT_VERSION}

RUN adduser -u 1042 --home /home/eve eve
RUN echo "eve ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/eve

USER eve

# Pre-install Cypress to save it in cache
WORKDIR /tmp
COPY package-lock.json ./
RUN npm install --no-save --no-package-lock cypress@$(node -p \
        -e "require('./package-lock.json').dependencies.cypress.version" \
    )

WORKDIR /home/eve/workspace/
