FROM centos:7

ARG BUILDBOT_VERSION=0.9.12
ARG OPERATOR_SDK_VERSION=v0.17.0

WORKDIR /home/eve/workspace

RUN yum install -y --setopt=skip_missing_names_on_install=False \
    epel-release \
    https://repo.ius.io/ius-release-el7.rpm \
    && yum-config-manager --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo \
    && yum install -y --setopt=skip_missing_names_on_install=False \
    sudo \
    gcc \
    hardlink \
    make \
    genisoimage \
    golang \
    python-devel \
    python-pip \
    skopeo \
    yum-utils \
    docker-ce-cli-18.09.6 \
    git224 \
    && curl -LO https://github.com/operator-framework/operator-sdk/releases/download/$OPERATOR_SDK_VERSION/operator-sdk-$OPERATOR_SDK_VERSION-x86_64-linux-gnu \
    && chmod +x operator-sdk-$OPERATOR_SDK_VERSION-x86_64-linux-gnu \
    && mkdir -p /usr/local/bin/ \
    && mv operator-sdk-$OPERATOR_SDK_VERSION-x86_64-linux-gnu /usr/local/bin/operator-sdk \
    && adduser -u 1042 --home /home/eve eve --groups docker \
    && mkdir -p /home/eve/.cache /home/eve/go \
    && chown eve:eve /home/eve/workspace /home/eve/.cache /home/eve/go \
    && pip install buildbot-worker==${BUILDBOT_VERSION} pyyaml

# Add eve to sudoers.
RUN echo "eve ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/eve

USER eve
