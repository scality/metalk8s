FROM docker.io/nginx:1.15.12-alpine

RUN apk add --no-cache \
        python3 \
        && \
    sed -i \
        '/location \/ {/i include\ \/var\/run\/static-container-registry.conf;' \
        /etc/nginx/conf.d/default.conf

VOLUME /var/lib/images
COPY entrypoint.sh /entrypoint.sh
COPY static-container-registry.py /static-container-registry.py

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
