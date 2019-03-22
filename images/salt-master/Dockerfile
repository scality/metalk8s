FROM centos:7.6.1810

MAINTAINER moonshot-platform <moonshot-platform@scality.com>

# Versions to use
ARG SALT_VERSION=2018.3.3

# Install saltstack
RUN printf "[saltstack-repo]\n\
name=SaltStack repo for RHEL/CentOS \$releasever\n\
baseurl=https://repo.saltstack.com/yum/redhat/\$releasever/\$basearch/archive/%s\n\
enabled=1\n\
gpgcheck=1\n\
gpgkey=https://repo.saltstack.com/yum/redhat/\$releasever/\$basearch/archive/%s/SALTSTACK-GPG-KEY.pub\n" ${SALT_VERSION} ${SALT_VERSION} >/etc/yum.repos.d/saltstack.repo \
 && rpm --import https://repo.saltstack.com/yum/redhat/7/x86_64/archive/${SALT_VERSION}/SALTSTACK-GPG-KEY.pub \
 && yum clean expire-cache \
 && yum install -y salt-master salt-api \
 && yum clean all

# salt-master, salt-api
EXPOSE 4505 4506

ENTRYPOINT ["/usr/bin/salt-master"]
