# SHA256 digest of the base image
ARG BASE_IMAGE_SHA256
ARG BASE_IMAGE

FROM ${BASE_IMAGE}@sha256:${BASE_IMAGE_SHA256}

# Versions to use
ARG SALT_VERSION

# Install Saltstack and other dependencies
RUN printf "[saltstack-repo]\n\
name=Scality SaltStack repo for RHEL/CentOS \$releasever\n\
baseurl=https://downloads.scality.com/repository/redhat/\$releasever/saltstack/%s\n\
enabled=1\n\
gpgcheck=1\n\
gpgkey=https://downloads.scality.com/repository/redhat/\$releasever/saltstack/%s/SALTSTACK-GPG-KEY.pub\n" ${SALT_VERSION} ${SALT_VERSION} >/etc/yum.repos.d/saltstack.repo \
 && microdnf clean all \
 && microdnf update -y \
 && microdnf install -y glibc-all-langpacks langpacks-en python3-pip epel-release \
 && pip3 install "pip == 21.3.1" \
 && pip3 install "protobuf ~= 3.19.4" "etcd3 != 0.11.0" "kubernetes ~= 30.1.0" \
 && microdnf install -y salt-master salt-api salt-ssh openssh-clients procps-ng \
 && microdnf remove -y epel-release \
 && microdnf clean all

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
