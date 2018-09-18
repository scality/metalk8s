# Note
# ----
# This container sets `ANSIBLE_INVENTORY` to `/inventory` and `KUBECONFIG` to
# `/inventory/artifacts/admin.conf`. As such, it assumes a MetalK8s inventory to
# be available at `/inventory`.
#
# To use this image:
#
# - Bind your inventory to `/inventory` in the container
# - Make sure your SSH Agent socket is available in the container, and
#   configured in the environment
# - Optionally disable SSH host key checking
#
# Example invocation:
#
# ```
# $ docker run -ti -v $(pwd)/inventory:/inventory \
#     -v $(readlink -f $SSH_AUTH_SOCK):/ssh-agent -e SSH_AUTH_SOCK=/ssh-agent \
#     -e ANSIBLE_HOST_KEY_CHECKING=False \
#     zenko/metalk8s
# ```
#
# Once in the environment, run
#
# ```
# (metalk8s) bash-4.4# ansible-playbook -b playbooks/deploy.yml
# ```
#
# and wait for the deployment to complete. Afterwards, run e.g. `kubectl get
# nodes` to validate connectivity.

FROM docker.io/alpine:3.7
WORKDIR /usr/src/metalk8s
VOLUME /inventory

ENV ANSIBLE_INVENTORY=/inventory
ENV KUBECONFIG=/inventory/artifacts/admin.conf

# Runtime dependencies of `make shell`
RUN apk --no-cache add \
        bash \
        bash-completion \
        libffi \
        make \
        openssl \
        python

RUN echo "source /etc/profile.d/bash_completion.sh" | tee ~/.bashrc

# Be able to run `make shell`
COPY Makefile requirements.txt ./
# Build dependencies of `make shell`
COPY hack/download.py hack/sha256sum.py hack/shell-bashrc hack/

RUN apk add --no-cache --virtual=build-dependencies \
                gcc \
                libffi-dev \
                musl-dev \
                openssl-dev \
                python-dev \
        && make shell \
        && apk del --no-cache build-dependencies \
        && rm -rf /root/.cache/pip

COPY . .

CMD ["make", "shell"]
