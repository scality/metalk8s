# SHA256 digest of the base image
ARG BASE_IMAGE_SHA256
ARG BASE_IMAGE=docker.io/rockylinux

FROM $BASE_IMAGE@sha256:$BASE_IMAGE_SHA256

# Kubernetes version
ARG KUBERNETES_VERSION
# Salt version
ARG SALT_VERSION
# Etcd version
ARG ETCD_VERSION

COPY configure-repos.sh /
RUN /configure-repos.sh $SALT_VERSION && rm /configure-repos.sh

# Timestamp of the build, formatted as RFC3339
ARG BUILD_DATE
# Git revision o the tree at build time
ARG VCS_REF
# Version of the image
ARG VERSION
# Version of the project, e.g. `git describe --always --long --dirty --broken`
ARG METALK8S_VERSION

# These contain BUILD_DATE so should come 'late' for layer caching
LABEL maintainer="squad-metalk8s@scality.com" \
      # http://label-schema.org/rc1/
      org.label-schema.build-date="$BUILD_DATE" \
      org.label-schema.name="metalk8s-utils" \
      org.label-schema.description="Utilities container for MetalK8s" \
      org.label-schema.url="https://github.com/scality/metalk8s/" \
      org.label-schema.vcs-url="https://github.com/scality/metalk8s.git" \
      org.label-schema.vcs-ref="$VCS_REF" \
      org.label-schema.vendor="Scality" \
      org.label-schema.version="$VERSION" \
      org.label-schema.schema-version="1.0" \
      # https://github.com/opencontainers/image-spec/blob/master/annotations.md
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.authors="squad-metalk8s@scality.com" \
      org.opencontainers.image.url="https://github.com/scality/metalk8s/" \
      org.opencontainers.image.source="https://github.com/scality/metalk8s.git" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.vendor="Scality" \
      org.opencontainers.image.title="metalk8s-utils" \
      org.opencontainers.image.description="Utilities container for MetalK8s" \
      # https://docs.openshift.org/latest/creating_images/metadata.html
      io.openshift.tags="metalk8s,utils" \
      io.k8s.description="Utilities container for MetalK8s" \
      io.openshift.non-scalable="true" \
      # Various
      com.scality.metalk8s.version="$METALK8S_VERSION"

# Final layers, installing tooling
RUN dnf clean expire-cache && \
    dnf update -y && \
    dnf install -y epel-release && \
    dnf install -y \
        bash-completion \
        bind-utils \
        bzip2 \
        conntrack-tools \
        cri-tools \
        curl \
        e2fsprogs \
        ebtables \
        ethtool \
        gdb \
        git \
        htop \
        httpd-tools \
        httpie \
        iftop \
        iotop \
        iperf \
        iperf3 \
        iproute \
        ipset \
        iptables \
        ipvsadm \
        jq \
        "kubectl-${KUBERNETES_VERSION}" \
        less \
        lsof \
        ltrace \
        lvm2 \
        net-tools \
        nethogs \
        nmap \
        nmap-ncat \
        openssh-clients \
        openssh-server \
        openssl \
        parted \
        perf \
        qperf \
        rsync \
        salt-master \
        salt-minion \
        screen \
        socat \
        strace \
        sysstat \
        tcpdump \
        telnet \
        tmux \
        util-linux \
        vim \
        wget \
        wireshark \
        xfsprogs \
        && \
    dnf clean all

# etcd is not packaged in RHEL/Rocky/CentOS 8 Extras repository, so we download/install
# it manually
RUN mkdir /tmp/etcd-download && \
    curl -L https://github.com/etcd-io/etcd/releases/download/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz \
        -o /tmp/etcd-${ETCD_VERSION}-linux-amd64.tar.gz && \
    tar xzvf /tmp/etcd-${ETCD_VERSION}-linux-amd64.tar.gz -C /tmp/etcd-download --strip-components=1 && \
    rm -f /tmp/etcd-${ETCD_VERSION}-linux-amd64.tar.gz && \
    mv /tmp/etcd-download/etcdctl /usr/bin && \
    rm -rf /tmp/etcd-download

RUN kubectl completion bash > /etc/bash_completion.d/kubectl
