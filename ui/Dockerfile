ARG NODE_IMAGE_VERSION=22-alpine3.19

FROM node:${NODE_IMAGE_VERSION}

USER node
WORKDIR /home/node

# Setup build dependencies
COPY package.json package-lock.json tsconfig.json /home/node/
RUN npm ci --legacy-peer-deps

USER root
RUN mkdir -p /home && echo -e "VERSION_MAJOR=1\nVERSION_MINOR=0\nVERSION_PATCH=0\nVERSION_SUFFIX=" > /home/VERSION
USER node

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["build"]
