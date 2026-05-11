ARG NGINX_IMAGE_VERSION=1.28.0-alpine
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

# Origin of the Guardian backend the chat panel iframes / postMessages talks to.
# Read by rspack.config.ts via DefinePlugin and baked into the bundle at build
# time, so changing it requires --no-cache or a clean build context. Empty
# default disables Guardian in the navbar — see src/navbar/NavBar.tsx.
ARG GUARDIAN_ORIGIN=""
ENV GUARDIAN_ORIGIN=$GUARDIAN_ORIGIN
RUN npm run rsbuild

FROM nginx:${NGINX_IMAGE_VERSION}

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
RUN mkdir shell
COPY --from=build-step /home/node/build ./shell
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf
ENTRYPOINT [ "/docker-entrypoint.sh" ]
CMD ["nginx", "-g", "daemon off;"]
