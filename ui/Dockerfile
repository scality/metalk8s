ARG NGINX_IMAGE_VERSION=1.15.8
ARG NODE_IMAGE_VERSION=10.16.0

FROM node:${NODE_IMAGE_VERSION} AS build-step

WORKDIR /home/node
COPY package*.json /home/node/
RUN npm install

COPY public /home/node/public
COPY src /home/node/src
RUN npm run build

FROM nginx:${NGINX_IMAGE_VERSION}

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
COPY --from=build-step /home/node/build ./
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
