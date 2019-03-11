#
# Downloaded packages
#

YUM_PACKAGES := \
    ftp://ftp.scientificlinux.org/linux/scientific/7x/external_products/extras/x86_64/container-selinux-2.77-1.el7_6.noarch.rpm \
    containerd \
    cri-tools \
    kubelet-1.11.7-0 \
    kubernetes-cni \
    m2crypto \
    python2-kubernetes \
    runc \
    salt-minion-2018.3.3-1.el7 \
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
