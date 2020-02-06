ARG NODE_IMAGE_VERSION=10.16.0

FROM node:${NODE_IMAGE_VERSION}

USER node
WORKDIR /home/node

# These are ordered by 'likeliness of change'
COPY config-overrides.js .babelrc /home/node/
COPY public /home/node/public
COPY package.json package-lock.json /home/node/
COPY src /home/node/src
COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["build"]
