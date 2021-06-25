FROM centos:7

ENV LANG=en_US.utf8

RUN curl -sL https://rpm.nodesource.com/setup_12.x | bash -
RUN yum install -y --setopt=skip_missing_names_on_install=False \
        epel-release \
        && \
    yum install -y --setopt=skip_missing_names_on_install=False \
        git \
        nginx \
        nodejs

COPY shell-ui/shell-ui-docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY shell-ui/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]

COPY shell-ui/conf/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# UI build (cannot use build stages for now) {{{

RUN adduser -u 1000 --home /home/node node

# USER node
WORKDIR /home/node/shell-ui

COPY shell-ui/package.json shell-ui/package-lock.json /home/node/shell-ui/
COPY ui-module-federation /home/node/ui-module-federation/

RUN npm config set unsafe-perm true && npm ci

COPY shell-ui/index-template.html shell-ui/webpack.*.js shell-ui/babel.config.js shell-ui/.flowconfig /home/node/shell-ui/
COPY shell-ui/src /home/node/shell-ui/src/

RUN npm run build

# USER root

# }}}

RUN mkdir -p /usr/share/nginx/html/shell
RUN cp -r build/* /usr/share/nginx/html/shell

CMD ["nginx", "-g", "daemon off;"]
