ARG NGINX_IMAGE_VERSION=1.15.8

FROM nginx:${NGINX_IMAGE_VERSION}

COPY metalk8s-ui-nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html/*

COPY ui /usr/share/nginx/html/
COPY docs/html /usr/share/nginx/html/docs
COPY shell-ui /usr/share/nginx/html/shell

CMD ["nginx", "-g", "daemon off;"]
