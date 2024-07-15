ARG NODE_IMAGE_VERSION=20-alpine3.19

FROM node:${NODE_IMAGE_VERSION}

USER node
WORKDIR /home/node

# Setup build dependencies
COPY package.json package-lock.json tsconfig.json /home/node/
RUN npm ci --legacy-peer-deps

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["build"]
