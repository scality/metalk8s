FROM node:16-bullseye
ARG BUILDBOT_VERSION=2.10.5
ENV LANG=en_US.utf8
ENV CYPRESS_CACHE_FOLDER=/home/node/.cache
RUN apt-get update -y && apt install software-properties-common -y \
    && sed -i "/^# deb.*universe/ s/^# //" /etc/apt/sources.list \
    && apt upgrade -y && apt install -y \
    gcc \
    python3 \
    python3-pip \
    git

WORKDIR /tmp
