# SHA256 digest of the base image
ARG BASE_IMAGE_SHA256
ARG BASE_IMAGE=docker.io/rockylinux

FROM ${BASE_IMAGE}@sha256:${BASE_IMAGE_SHA256}

# Versions to use
ARG SALT_VERSION

# Install Saltstack and other dependencies
RUN printf "[saltstack-repo]\n\
name=SaltStack repo for RHEL/CentOS \$releasever\n\
baseurl=https://repo.saltproject.io/salt/py3/redhat/\$releasever/\$basearch/minor/%s/\n\
enabled=1\n\
gpgcheck=1\n\
gpgkey=https://repo.saltproject.io/salt/py3/redhat/\$releasever/\$basearch/minor/%s/SALT-PROJECT-GPG-PUBKEY-2023.pub\n" ${SALT_VERSION} ${SALT_VERSION} >/etc/yum.repos.d/saltstack.repo \
 && rpm --import https://repo.saltproject.io/salt/py3/redhat/8/x86_64/minor/${SALT_VERSION}/SALT-PROJECT-GPG-PUBKEY-2023.pub \
 && dnf clean expire-cache \
 && dnf update -y \
 && dnf install -y salt-master salt-api salt-ssh openssh-clients procps-ng \
 && dnf install -y git \
 && salt-pip install --upgrade pip \
 && salt-pip install "git+https://github.com/kubernetes-client/python.git@v27.2.0#egg=kubernetes" \
 && salt-pip install "protobuf <= 3.20.1" "etcd3 != 0.11.0" \
 && dnf remove -y git \
 && dnf install -y glibc-all-langpacks langpacks-en \
 && dnf clean all

# patch salt 
COPY patch.sh /
RUN /patch.sh

# Set up locale
ENV LC_ALL=en_US.UTF-8

# Disable host key checking due to a bug in salt-ssh
# Sees: https://github.com/saltstack/salt/issues/59691
RUN mkdir /root/.ssh \
  && printf "Host *\n\
  StrictHostKeyChecking no\n" > /root/.ssh/config

# salt-master, salt-api
EXPOSE 4505 4506

ENTRYPOINT ["/usr/bin/salt-master"]
