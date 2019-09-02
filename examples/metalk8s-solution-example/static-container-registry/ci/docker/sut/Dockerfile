FROM docker.io/ubuntu:xenial

RUN apt-get update \
      && \
      apt-get install -y software-properties-common\
      && \
      add-apt-repository ppa:projectatomic/ppa \
      && \
      apt-get update \
      && \
      apt-get install -y skopeo

RUN apt-get update \
        && \
        apt-get install -y \
            apt-transport-https \
            curl \
        && \
        curl https://pgrange.github.io/bash-unit_deb/keys.asc | apt-key add - \
        && \
        echo deb https://pgrange.github.io/bash-unit_deb/debian/ unstable/ | \
            tee -a /etc/apt/sources.list.d/bash-unit.list \
        && \
        apt-get update \
        && \
        apt-get install bash-unit

COPY test.sh /
