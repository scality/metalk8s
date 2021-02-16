ARG NGINX_IMAGE_VERSION=1.18.0-alpine
ARG NODE_IMAGE_VERSION=10.16.0

FROM node:${NODE_IMAGE_VERSION} AS build-step

WORKDIR /home/node
COPY package*.json /home/node/

# `npm config set unsafe-perm true` is needed in order to let npm run core-ui prepare script when installing dependencies in a context with root access
# Ref : https://npm.community/t/npm-ci-not-running-prepare-for-git-dependencies-when-run-as-root-in-docker/4485/2
RUN npm config set unsafe-perm true && npm ci

COPY webpack.*.js babel.config.js .flowconfig /home/node/
COPY src /home/node/src

RUN npm run build

FROM nginx:${NGINX_IMAGE_VERSION}

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
RUN mkdir shell
COPY health ./shell
RUN mkdir -p /etc/metalk8s/shell-ui
COPY conf/config.json /etc/metalk8s/shell-ui/config.json
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY --from=build-step /home/node/dist ./shell
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf
ENTRYPOINT [ "/entrypoint.sh" ]
CMD ["nginx", "-g", "daemon off;"]
