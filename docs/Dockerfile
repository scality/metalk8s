# NOTE: this Docker image is meant to be built using the root of the repository
# as context
# NOTE: the MetalK8s repository root is supposed to be mounted at
# `/usr/src/metalk8s` when running the container

FROM docker.io/ubuntu:22.04

RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
        sudo \
        enchant-2 \
        curl \
        git \
        make \
        plantuml \
        graphviz \
        python3.10 \
        python3-pip \
        python3-setuptools \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# NOTE: the tox package available is too old; we want tox >= 3.4, for the
# `commands_pre` syntax
RUN python3 -m pip install six==1.16.0 tox~=4.12.1 && \
    rm -rf ~/.cache/pip

WORKDIR /usr/src/metalk8s

COPY tox.ini .
COPY docs/requirements.txt docs/

RUN tox --workdir /tmp/tox --notest -e docs && \
    rm -rf ~/.cache/pip
