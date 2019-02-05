FROM docker.io/centos:7.6.1810 as fetcher

RUN useradd build
RUN yum install -y epel-release git && \
    yum install -y golang

# Glide 0.13.1 which ships in CentOS is broken when using --strip-vendor...
RUN curl -L -o /tmp/glide-v0.13.2-linux-amd64.tar.gz https://github.com/Masterminds/glide/releases/download/v0.13.2/glide-v0.13.2-linux-amd64.tar.gz && \
    tar -zxf /tmp/glide-v0.13.2-linux-amd64.tar.gz -C /usr/local/bin --strip-components=1 linux-amd64/glide && \
    rm /tmp/glide-v0.13.2-linux-amd64.tar.gz

USER build

RUN mkdir -p /home/build/go/src/github.com/projectcalico && \
    cd /home/build/go/src/github.com/projectcalico && \
    git clone -b v3.4.0 https://github.com/projectcalico/cni-plugin cni-plugin && \
    cd cni-plugin && \
    /usr/local/bin/glide install --strip-vendor && \
    git archive --format=tar.gz --prefix=calico-cni-plugin-3.4.0/ -o /home/build/calico-cni-plugin-3.4.0.tar.gz
