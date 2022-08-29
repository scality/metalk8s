FROM node:16-bullseye
ARG BUILDBOT_VERSION=2.10.5
ENV LANG=en_US.utf8
RUN apt-get update -y && apt install software-properties-common -y \
    && sed -i "/^# deb.*universe/ s/^# //" /etc/apt/sources.list \
    && apt upgrade -y && apt install -y \
    gcc \
    sudo \
    python3 \
    python3-pip \
    git \
    && adduser -u 1042 --home /home/eve eve \
    && chown -R eve:eve /home/eve \
    && python3 -m pip install buildbot-worker==${BUILDBOT_VERSION}
# Add eve to sudoers.
RUN echo "eve ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/eve
USER eve
# Installing dependencies to generate a re-usable cache under /home/eve/.npm
WORKDIR /tmp
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
WORKDIR /home/eve/workspace/