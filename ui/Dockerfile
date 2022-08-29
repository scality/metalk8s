ARG NODE_IMAGE_VERSION=16.14.0

FROM node:${NODE_IMAGE_VERSION}

USER node
WORKDIR /home/node

# Setup build dependencies
COPY package.json package-lock.json /home/node/
RUN npm ci --legacy-peer-deps

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["build"]
