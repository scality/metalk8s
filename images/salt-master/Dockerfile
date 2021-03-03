FROM centos:7.6.1810

MAINTAINER moonshot-platform <moonshot-platform@scality.com>

# Versions to use
ARG SALT_VERSION

# Install saltstack
RUN printf "[saltstack-repo]\n\
name=SaltStack repo for RHEL/CentOS \$releasever\n\
baseurl=https://repo.saltstack.com/py3/redhat/\$releasever/\$basearch/archive/%s\n\
enabled=1\n\
gpgcheck=1\n\
gpgkey=https://repo.saltstack.com/py3/redhat/\$releasever/\$basearch/archive/%s/SALTSTACK-GPG-KEY.pub\n" ${SALT_VERSION} ${SALT_VERSION} >/etc/yum.repos.d/saltstack.repo \
 && rpm --import https://repo.saltstack.com/py3/redhat/7/x86_64/archive/${SALT_VERSION}/SALTSTACK-GPG-KEY.pub \
 && yum clean expire-cache \
 && yum install -y epel-release \
 && yum install -y python3-pip \
 && pip3 install pip==20.1 \
 && pip3 install "etcd3 != 0.11.0" \
 && yum install -y git \
 && pip3 install "git+https://github.com/kubernetes-client/python.git@cef5e9bd10a6d5ca4d9c83da46ccfe2114cdaaf8#egg=kubernetes" \
 && yum remove -y git \
 && pip3 uninstall -y \
     requests \
     urllib3 \
 && yum install -y salt-master salt-api salt-ssh openssh-clients \
 && yum clean all

# salt-master, salt-api
EXPOSE 4505 4506

ENTRYPOINT ["/usr/bin/salt-master"]
