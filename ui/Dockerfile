ARG NGINX_IMAGE_VERSION=1.15.8
ARG NODE_IMAGE_VERSION=10.16.0

FROM node:${NODE_IMAGE_VERSION} AS build-step

WORKDIR /home/node

# These are ordered by 'likeliness of change'
COPY config-overrides.js .babelrc /home/node/
COPY public /home/node/public

COPY package*.json /home/node/
RUN npm ci

COPY src /home/node/src
RUN npm run build

FROM nginx:${NGINX_IMAGE_VERSION}

COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
COPY --from=build-step /home/node/build ./

CMD ["nginx", "-g", "daemon off;"]
