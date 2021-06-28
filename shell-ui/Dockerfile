ARG NGINX_IMAGE_VERSION=1.18.0-alpine
ARG NODE_IMAGE_VERSION=14.16.0

FROM node:${NODE_IMAGE_VERSION} AS build-step

WORKDIR /home/node
COPY package*.json /home/node/

# `npm config set unsafe-perm true` is needed in order to let npm run core-ui prepare script when installing dependencies in a context with root access
# Ref : https://npm.community/t/npm-ci-not-running-prepare-for-git-dependencies-when-run-as-root-in-docker/4485/2
RUN npm config set unsafe-perm true && npm ci

COPY index-template.html webpack.*.js babel.config.js .flowconfig /home/node/
COPY src /home/node/src

RUN npm run build

FROM nginx:${NGINX_IMAGE_VERSION}

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
RUN mkdir shell
COPY public/shell/config.json ./shell
COPY --from=build-step /home/node/build ./shell
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf
ENTRYPOINT [ "/docker-entrypoint.sh" ]
CMD ["nginx", "-g", "daemon off;"]
