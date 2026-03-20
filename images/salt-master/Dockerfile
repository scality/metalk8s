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
 # NOTE: We pin the pip version to 21.1.3 since it's the last version that do not have
 # the VerboseLogger that may cause issues with salt logger
 # Sees: https://github.com/pypa/pip/issues/10212
 # Sees: https://github.com/pypa/pip/pull/9450
 # It seems newer versions of Salt workaround this issue so it has to be removed
 # when we will bump the Salt version to a version that does not have this issue
 # Sees: https://github.com/saltstack/salt/issues/62279
 && pip3 install "pip == 21.1.3" \
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
