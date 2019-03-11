FROM centos:7.6.1810

MAINTAINER moonshot-platform <moonshot-platform@scality.com>

# Versions to use
ARG SALT_VERSION=2019.2.0
ARG TINI_VERSION=v0.18.0

# Install and check tini
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini.asc /tini.asc

RUN gpg --batch --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 595E85A6B1B4779EA4DAAEC70B588DFF0527A9B7 \
 && gpg --batch --verify /tini.asc /tini

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
 && yum clean all \
 && chmod +x /tini

# salt-master, salt-api
EXPOSE 4505 4506

ENTRYPOINT ["/tini", "--", "/usr/bin/salt-master"]
