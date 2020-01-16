ARG NODE_IMAGE_VERSION=10.16.0

FROM node:${NODE_IMAGE_VERSION}

USER node
WORKDIR /home/node

# These are ordered by 'likeliness of change'
COPY public /home/node/public
COPY package.json package-lock.json .babelrc /home/node/
COPY src /home/node/src
COPY config /home/node/config
COPY scripts /home/node/scripts
COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
