FROM node:16-bullseye

ENV LANG=en_US.utf8
ENV CYPRESS_CACHE_FOLDER=/home/node/.cache

RUN apt-get update -y && apt install software-properties-common -y \
    && sed -i "/^# deb.*universe/ s/^# //" /etc/apt/sources.list \
    && apt upgrade -y && apt install -y git nginx python3

COPY shell-ui-docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]

COPY conf/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# UI build (cannot use build stages for now) {{{

# USER node
WORKDIR /home/node

COPY package.json package-lock.json /home/node/

RUN npm config set unsafe-perm true && npm ci --legacy-peer-deps

COPY index-template.html webpack.*.js babel.config.js .flowconfig /home/node/
COPY public /home/node/public/
COPY src /home/node/src/

RUN npm run build

# USER root

# }}}

RUN mkdir -p /usr/share/nginx/html/shell
RUN cp -r build/* /usr/share/nginx/html/shell

CMD ["nginx", "-g", "daemon off;"]
