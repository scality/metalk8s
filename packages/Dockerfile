FROM base-centos-image as build

RUN yum install -y \
        createrepo \
        rpm-build \
        rpmdevtools \
        rpmlint \
        yum-utils \
        && \
    yum clean all

RUN useradd -m build
