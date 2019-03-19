# Equal to centos:7.6.1810
# SHA256 digest of the base image
ARG BUILD_IMAGE_SHA256=5d4f4e6051c7cc10f2e712f9dc3f86a2bd67e457bced7ca52a71c243099c0121
ARG BUILD_IMAGE=docker.io/centos
FROM ${BUILD_IMAGE}@sha256:${BUILD_IMAGE_SHA256}

RUN yum install -y \
        epel-release \
        && \
    yum install -y \
        nginx \
        && \
    sed -ri '/location \/ \{/,/.*\}/d' /etc/nginx/nginx.conf \
        && \
    yum clean all

# forward request and error logs to docker log collector
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

EXPOSE 80

STOPSIGNAL SIGTERM

CMD ["nginx", "-g", "daemon off;"]

COPY metalk8s-ui.conf /etc/nginx/default.d/metalk8s-ui.conf

ARG PACKAGE

COPY \
    "${PACKAGE}" \
    "/root/"

RUN yum localinstall -y \
        "/root/${PACKAGE}" \
        && \
    yum clean all
