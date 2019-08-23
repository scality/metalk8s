ARG NGINX_IMAGE_VERSION=1.15.8
ARG NODE_IMAGE_VERSION=10.16.0

FROM node:${NODE_IMAGE_VERSION} AS build-step

USER node
WORKDIR /home/node
# Install only dev dependencies that are necessary for the build.
RUN npm install \
    @babel/plugin-proposal-nullish-coalescing-operator@7.4.4 \
    @babel/plugin-proposal-optional-chaining@7.2.0 \
    customize-cra@0.4.1 \
    react-app-rewired@2.1.3
COPY package*.json /home/node/
COPY config-overrides.js .babelrc /home/node/
RUN npm install --only=prod

COPY public /home/node/public
COPY src /home/node/src
RUN npm run build

FROM nginx:${NGINX_IMAGE_VERSION}

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
COPY --from=build-step /home/node/build ./
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
