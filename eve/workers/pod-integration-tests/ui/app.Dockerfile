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

COPY ui/standalone-nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# UI build (cannot use build stages for now) {{{

RUN adduser -u 1000 --home /home/node node

#USER node
WORKDIR /home/node/ui

COPY ui/package.json ui/package-lock.json /home/node/ui/
COPY ui-module-federation /home/node/ui-module-federation/

RUN npm config set unsafe-perm true && npm ci

COPY ui/.babelrc ui/webpack.common.js ui/webpack.prod.js /home/node/ui/
COPY ui/public /home/node/ui/public/
COPY ui/src /home/node/ui/src/

RUN npm run build

#USER root

# }}}

RUN cp -r build/* /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]
