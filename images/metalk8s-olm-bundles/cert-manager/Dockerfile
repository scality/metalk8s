ARG BASE_IMG
FROM $BASE_IMG AS base

FROM alpine as post
COPY --from=base /manifests/ /manifests/
RUN find /manifests/ -type f -exec sed -i -e "s;quay.io/jetstack;registry.metalk8s.lan;g" {} \;

FROM base
COPY --from=post /manifests/ /manifests/

