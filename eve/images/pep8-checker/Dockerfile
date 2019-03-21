# Note: this Docker image is meant to be built using the root of the repository
# as context
# Note: the MetalK8s repository root is supposed to be mounted at
# `/usr/src/metalk8s` when running the container

FROM alpine:3.8

RUN apk add --no-cache \
        gcc \
        git \
        musl-dev \
        python \
        python2-dev \
        python3 \
        py2-pip \
        && \
    pip install tox && \
    pip install buildbot-worker==1.8.0

WORKDIR /usr/src/metalk8s
ARG USER_ID=1000
RUN adduser -u ${USER_ID} -G users -h /usr/src/metalk8s -D user && \
    chown user:users /usr/src/metalk8s
USER user

COPY tox.ini .
RUN tox --workdir /var/tmp/tox --notest -e pep8 && \
    rm -rf ~/.cache/pip

ENTRYPOINT ["tox", "--workdir", "/var/tmp/tox", "-e", "pep8", "--"]
