# SHA256 digest of the base image
ARG BASE_IMAGE_SHA256
ARG BASE_IMAGE

FROM ${BASE_IMAGE}@sha256:${BASE_IMAGE_SHA256}

# Versions to use
ARG SALT_VERSION

# Install Saltstack and other dependencies
RUN curl -fsSL https://github.com/saltstack/salt-install-guide/releases/latest/download/salt.repo > /etc/yum.repos.d/salt.repo \
 && microdnf clean all \
 && microdnf update -y \
 # `dnf` is required by Salt's `yumpkg` module (used by e.g. `pkg.version_cmp`):
 # its `__virtual__` rejects load if neither dnf/dnf5/tdnf/yum is on PATH;
 # microdnf is not recognized.
 && microdnf install -y \
      salt-master-${SALT_VERSION} salt-api-${SALT_VERSION} salt-ssh-${SALT_VERSION} \
      openssh-clients procps-ng \
      dnf \
      glibc-all-langpacks langpacks-en \
      patch \
 && salt-pip install --no-cache-dir --upgrade pip \
 # Pin protobuff version since newer versions does not work with etcd3
 && salt-pip install --no-cache-dir "protobuf <= 3.20.1" "etcd3 != 0.11.0" "kubernetes ~= 33.1.0" \
 && microdnf clean all

# Apply local patches against the bundled salt onedir install; see
# images/salt-master/patches/ for the standalone unified diffs and headers.
COPY patches/ /tmp/salt-patches/
RUN SALT_SITE_PACKAGES=$(salt-pip show salt | sed -n 's/^Location: //p') \
 && for patch_file in /tmp/salt-patches/salt-3006-*.patch; do \
        echo "Applying $patch_file"; \
        patch -p1 -d "$SALT_SITE_PACKAGES" < "$patch_file"; \
    done \
 && rm -rf /tmp/salt-patches

# Set up locale
ENV LC_ALL=en_US.UTF-8

# Disable host key checking due to a bug in salt-ssh
# Sees: https://github.com/saltstack/salt/issues/59691
RUN mkdir /root/.ssh \
  && printf "Host *\n\
  StrictHostKeyChecking no\n" > /root/.ssh/config

# salt-master, salt-api
EXPOSE 4505 4506

ENTRYPOINT ["/usr/bin/salt-master"]
