ARG NGINX_IMAGE_VERSION=1.18.0-alpine
ARG NODE_IMAGE_VERSION=20-alpine3.19

FROM node:${NODE_IMAGE_VERSION} AS build-step


USER node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY package.json package-lock.json tsconfig.json /home/node/

ENV npm_config_cache /home/node/app/.npm
RUN npm ci --legacy-peer-deps

COPY index-template.html rspack.config.ts tsconfig.json /home/node/
COPY public /home/node/public
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
