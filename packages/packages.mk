#
# Downloaded packages
#

YUM_PACKAGES := \
    ftp://ftp.scientificlinux.org/linux/scientific/7x/external_products/extras/x86_64/container-selinux-2.77-1.el7_6.noarch.rpm \
    containerd \
    cri-tools \
    kubelet-1.11.7-0 \
    kubernetes-cni \
    python34-certifi \
    python34-dateutil \
    python34-jwt \
    python34-m2crypto \
    python34-PyYAML \
    python34-requests \
    python34-six \
    python34-urllib3 \
    python34-websocket-client \
    runc \
    salt-minion-2019.2.0-1.el7 \
    skopeo \
    yum-plugin-versionlock \

# Simple file containing the list of packages fetched during the last run
YUM_PACKAGES_CACHE := $(PACKAGES_ROOT)/.yum_packages_cache
LAST_RUN := $(shell [[ -f ${YUM_PACKAGES_CACHE} ]] && cat $(YUM_PACKAGES_CACHE))

ifneq ($(LAST_RUN),$(YUM_PACKAGES))
  $(YUM_PACKAGES_CACHE): FORCE | $(PACKAGES_ROOT) $(BASE_REPO_ROOT) $(BUILDER_CONTAINER)
	$(DOCKER) run \
		--env RELEASEVER=7 \
		--env TARGET_UID=$(TARGET_UID) \
		--env TARGET_GID=$(TARGET_GID) \
		--hostname build \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(PACKAGES_ROOT),destination=/install_root \
		--mount type=bind,source=$(BASE_REPO_ROOT),destination=/repositories \
		--mount type=bind,source=$(BASE_DIR)/entrypoint.sh,destination=/entrypoint.sh,ro \
		--rm \
		$(BUILDER_IMAGE) \
		/entrypoint.sh download_packages $(YUM_PACKAGES)
	@echo "$(YUM_PACKAGES)" > $@

  FORCE:
else
  $(info Skipping packages download.)
endif

#
# Calico CNI Plugin
#

calico-name := calico-cni-plugin
calico-version := 3.5.1
calico-build := 1

calico-suffix := .el7
calico-arch := x86_64
calico-reponame := scality

calico-sources := \
  v$(calico-version).tar.gz \
  calico-amd64 \
  calico-ipam-amd64

$(eval $(call create-pkg-from-source,calico))

#
# Python Kubernetes client
#

python-kubernetes-name := python34-kubernetes
python-kubernetes-version := 8.0.1
python-kubernetes-build := 1

python-kubernetes-suffix := .el7
python-kubernetes-reponame := scality

python-kubernetes-sources := \
  v$(python-kubernetes-version).tar.gz \
  83ebb9d5fdc0d46bbb2e30afcd8eec42c5da4ad1.tar.gz

$(eval $(call create-pkg-from-source,python-kubernetes))

#
# Python Azure Active Directory library
#

python-adal-name := python34-adal
python-adal-version := 1.2.1
python-adal-build := 1

python-adal-suffix := .el7
python-adal-reponame := scality

python-adal-sources := $(python-adal-version).tar.gz

$(eval $(call create-pkg-from-source,python-adal))

#
# Python Google Auth library
#

python-googleauth-name := python34-google-auth
python-googleauth-version := 1.6.3
python-googleauth-build := 1

python-googleauth-suffix := .el7
python-googleauth-reponame := scality

python-googleauth-sources := v$(python-googleauth-version).tar.gz

$(eval $(call create-pkg-from-source,python-googleauth))

#
# Python OAuth library
#

python-oauthlib-name := python34-oauthlib
python-oauthlib-version := 3.0.1
python-oauthlib-build := 1

python-oauthlib-suffix := .el7
python-oauthlib-reponame := scality

python-oauthlib-sources := v$(python-oauthlib-version).tar.gz

$(eval $(call create-pkg-from-source,python-oauthlib))

#
# Python oauthlib support for Requests
#

python-requests-oauthlib-name := python34-requests-oauthlib
python-requests-oauthlib-version := 1.1.0
python-requests-oauthlib-build := 1

python-requests-oauthlib-suffix := .el7
python-requests-oauthlib-reponame := scality

python-requests-oauthlib-sources := v$(python-requests-oauthlib-version).tar.gz

$(eval $(call create-pkg-from-source,python-requests-oauthlib))
