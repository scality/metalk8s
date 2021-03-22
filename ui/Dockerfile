ARG NODE_IMAGE_VERSION=14.16.0

FROM node:${NODE_IMAGE_VERSION}

USER node
WORKDIR /home/node

# Setup build dependencies
COPY package.json package-lock.json /home/node/
RUN npm ci

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["build"]
