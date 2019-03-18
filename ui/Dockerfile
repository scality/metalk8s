FROM node AS build-step

ARG NGINX_IMAGE_VERSION=1.15.8

WORKDIR /home/node
COPY . /home/node/
RUN yarn && yarn build


FROM nginx

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
COPY --from=build-step /home/node/build ./
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]