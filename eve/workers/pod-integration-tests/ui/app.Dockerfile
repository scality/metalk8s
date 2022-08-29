FROM node:16-bullseye

ENV LANG=en_US.utf8
ENV CYPRESS_CACHE_FOLDER=/home/node/.cache

RUN apt-get update -y && apt install software-properties-common -y \
    && sed -i "/^# deb.*universe/ s/^# //" /etc/apt/sources.list \
    && apt upgrade -y && apt install -y git nginx python3 

COPY standalone-nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# UI build (cannot use build stages for now) {{{

#USER node
WORKDIR /home/node

COPY package.json package-lock.json /home/node/

RUN npm config set unsafe-perm true && npm ci --legacy-peer-deps

COPY babel.config.js webpack.common.js webpack.prod.js /home/node/
COPY public /home/node/public/
COPY src /home/node/src/

RUN npm run build

#USER root

# }}}

RUN bash -c "shopt -s dotglob && cp -r build/* /usr/share/nginx/html/"

CMD ["nginx", "-g", "daemon off;"]
