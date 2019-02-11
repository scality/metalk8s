FROM docker.io/centos:7.6.1810

RUN yum install -y \
        mock \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yum-utils && \
    yum clean all

RUN useradd -U -G mock -m build && \
    rpmdev-setuptree /home/build/rpmbuild

USER build

VOLUME /var/lib/mock
VOLUME /var/cache/mock
VOLUME /tmp
