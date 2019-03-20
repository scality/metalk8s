ARG NGINX_IMAGE_VERSION=1.15.8

FROM node AS build-step

WORKDIR /home/node
COPY . /home/node/
RUN npm install
RUN npm run build

FROM nginx:${NGINX_IMAGE_VERSION}

WORKDIR /usr/share/nginx/html/
RUN rm -rf ./*
COPY --from=build-step /home/node/build ./
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
