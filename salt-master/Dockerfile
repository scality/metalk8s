FROM centos:7.6.1810

MAINTAINER moonshot-platform <moonshot-platform@scality.com>

# Salt version to use
ARG SALT_VERSION=2018.3-1

# Install saltstack repository
RUN yum install -y https://repo.saltstack.com/yum/redhat/salt-repo-${SALT_VERSION}.el7.noarch.rpm \
 && yum install -y salt-master salt-api

# salt-master, salt-api
EXPOSE 4505 4506

ENTRYPOINT ["/usr/bin/salt-master"]
