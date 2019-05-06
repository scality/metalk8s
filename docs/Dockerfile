# NOTE: this Docker image is meant to be built using the root of the repository
# as context
# NOTE: the MetalK8s repository root is supposed to be mounted at
# `/usr/src/metalk8s` when running the container

FROM docker.io/ubuntu:18.04

RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
        enchant \
        curl \
        git \
        latexmk \
        make \
        plantuml \
        python3.6 \
        python3-buildbot-worker \
        python3-pip \
        texlive-fonts-extra \
        texlive-fonts-recommended \
        texlive-latex-extra \
        texlive-latex-recommended \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# NOTE: the tox package available is too old; we want tox >= 3.4, for the
# `commands_pre` syntax
RUN python3.6 -m pip install tox && \
    rm -rf ~/.cache/pip

WORKDIR /usr/src/metalk8s

RUN mkdir docs

COPY tox.ini .
COPY docs/requirements.txt docs/

RUN tox --workdir /tmp/tox --notest -e docs && \
    rm -rf ~/.cache/pip

ENTRYPOINT ["tox", "--workdir", "/tmp/tox", "-e", "docs", "--"]
CMD ["html"]
