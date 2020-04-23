FROM centos:7.6.1810

MAINTAINER moonshot-platform <moonshot-platform@scality.com>

# Versions to use
ARG SALT_VERSION=2018.3.4

# Install saltstack
RUN printf "[saltstack-repo]\n\
name=SaltStack repo for RHEL/CentOS \$releasever\n\
baseurl=https://repo.saltstack.com/yum/redhat/\$releasever/\$basearch/archive/%s\n\
enabled=1\n\
gpgcheck=1\n\
gpgkey=https://repo.saltstack.com/yum/redhat/\$releasever/\$basearch/archive/%s/SALTSTACK-GPG-KEY.pub\n" ${SALT_VERSION} ${SALT_VERSION} >/etc/yum.repos.d/saltstack.repo \
 && rpm --import https://repo.saltstack.com/yum/redhat/7/x86_64/archive/${SALT_VERSION}/SALTSTACK-GPG-KEY.pub \
 && yum clean expire-cache \
 && yum install -y epel-release \
 && yum install -y salt-master salt-api salt-ssh openssh-clients \
 && yum install -y python-pip \
 && pip install pip==20.0.2 \
 # TODO: issue #2454
 # Docker build will die here because we have PyYAML==3.11 installed
 # ERROR: Cannot uninstall 'PyYAML'. It is a distutils installed project and
 # thus we cannot accurately determine which files belong to it which would lead to only a partial uninstall
 # Since kubernetes-client requires PyYAML==3.12 ipaddress==1.0.17 we can ignore the installed versions using:
 && pip install setuptools==40.3.0 \
 && pip install --ignore-installed PyYAML==3.12 ipaddress==1.0.17 \
 && pip install kubernetes==11.0.0 \
 # End
 && pip install "etcd3 != 0.11.0" \
 && yum clean all

# salt-master, salt-api
EXPOSE 4505 4506

ENTRYPOINT ["/usr/bin/salt-master"]
