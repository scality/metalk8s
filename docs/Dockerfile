# Note: this Docker image is meant to be built using the root of the repository
# as context
# Note: the MetalK8s repository root is supposed to be mounted at
# `/usr/src/metalk8s` when running the container

FROM docker.io/ubuntu:18.04

RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
        enchant \
        git \
        latexmk \
        make \
        python2.7 \
        python3-buildbot-worker \
        texlive-fonts-extra \
        texlive-fonts-recommended \
        texlive-latex-extra \
        texlive-latex-recommended \
        texlive-xetex \
        tox \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/metalk8s

RUN mkdir docs

COPY tox.ini .
COPY docs/requirements.txt docs/

RUN tox --workdir /tmp/tox --notest -e docs && \
    rm -rf ~/.cache/pip

ENTRYPOINT ["tox", "--workdir", "/tmp/tox", "-e", "docs", "--"]
CMD ["html"]
