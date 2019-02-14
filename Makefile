.POSIX:

MAKEFLAGS += -r
.DEFAULT_GOAL := default
.DELETE_ON_ERROR:
.SUFFIXES:
SHELL := /bin/bash

include VERSION

PWD := $(shell pwd)

BUILD_ROOT ?= $(PWD)/_build
ISO_ROOT ?= $(BUILD_ROOT)/root
ISO ?= $(BUILD_ROOT)/metalk8s.iso

CALICO_CNI_PLUGIN_VERSION = 3.5.1
CALICO_CNI_PLUGIN_BUILD = 1

ALL = \
	$(ISO_ROOT)/bootstrap.sh \
	\
	$(ISO_ROOT)/salt/metalk8s/containerd/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/containerd/init.sls \
	$(ISO_ROOT)/salt/metalk8s/containerd/installed.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/defaults.yaml \
	\
	$(ISO_ROOT)/salt/metalk8s/kubelet/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubelet/installed.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/map.jinja \
	\
	$(ISO_ROOT)/salt/metalk8s/repo/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/repo/init.sls \
	$(ISO_ROOT)/salt/metalk8s/repo/offline.sls \
	$(ISO_ROOT)/salt/metalk8s/repo/online.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/runc/init.sls \
	$(ISO_ROOT)/salt/metalk8s/runc/installed.sls \
	\
	$(ISO_ROOT)/pillar/repositories.sls \
	$(ISO_ROOT)/pillar/top.sls \
	\
	$(ISO_ROOT)/product.txt \
	\
	$(SCALITY_EL7_REPO) \

PACKAGE_BUILD_CONTAINER := $(BUILD_ROOT)/package-build-container
PACKAGE_BUILD_IMAGE ?= metalk8s-build:latest

CALICO_CNI_PLUGIN_SOURCES = \
	v$(CALICO_CNI_PLUGIN_VERSION).tar.gz \
	calico-amd64 \
	calico-ipam-amd64 \

SCALITY_EL7_ROOT = $(ISO_ROOT)/packages/scality-el7
SCALITY_EL7_RPMS = \
	$(SCALITY_EL7_ROOT)/x86_64/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm \

SCALITY_EL7_REPODATA = $(SCALITY_EL7_ROOT)/repodata/repomd.xml
SCALITY_EL7_REPO = $(SCALITY_EL7_RPMS) $(SCALITY_EL7_REPODATA)


default: all
.PHONY: default

all: $(ISO)
.PHONY: all

all-local: $(ALL) ## Build all artifacts in the build tree
.PHONY: all-local

$(ISO_ROOT)/bootstrap.sh: scripts/bootstrap.sh.in $(ISO_ROOT)/product.txt
	mkdir -p $(shell dirname $@)
	rm -f $@
	sed s/@VERSION@/$(shell source $(ISO_ROOT)/product.txt && echo $$SHORT_VERSION)/g < $< > $@ || (rm -f $@; false)
	chmod a+x $@

$(ISO_ROOT)/salt/%: salt/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp -a $< $@

$(ISO_ROOT)/pillar/top.sls: pillar/top.sls.in $(ISO_ROOT)/product.txt
	mkdir -p $(shell dirname $@)
	rm -f $@
	sed s/@VERSION@/$(shell source $(ISO_ROOT)/product.txt && echo $$SHORT_VERSION)/g < $< > $@ || (rm -f $@; false)

$(ISO_ROOT)/pillar/%: pillar/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp -a $< $@

$(ISO_ROOT)/product.txt: scripts/product.sh VERSION FORCE
	rm -f $@
	mkdir -p $(shell dirname $@)
	env \
		VERSION_MAJOR=$(VERSION_MAJOR) \
		VERSION_MINOR=$(VERSION_MINOR) \
		VERSION_PATCH=$(VERSION_PATCH) \
		VERSION_SUFFIX=$(VERSION_SUFFIX) \
		$< > $@ || (rm -f $@; false)

FORCE:

clean: ## Clean the build tree
	rm -rf $(BUILD_ROOT)
.PHONY: clean

iso: $(ISO) ## Build the MetalK8s ISO image
.PHONY: iso

$(ISO): $(ALL)
	source $(ISO_ROOT)/product.txt && \
	mkisofs -output $@ \
		-rock \
		-joliet \
		-joliet-long \
		-full-iso9660-filenames \
		-volid "$${NAME} $${VERSION}" \
		--iso-level 3 \
		-gid 0 \
		-uid 0 \
		-input-charset utf-8 \
		-output-charset utf-8 \
		$(ISO_ROOT)


VAGRANT ?= vagrant
VAGRANT_DEFAULT_PROVIDER ?= virtualbox
VAGRANT_UP_OPTS ?= --provision --no-destroy-on-error --parallel --provider=$(VAGRANT_DEFAULT_PROVIDER)

vagrantup: $(ALL) ## Run 'vagrant up' to (re-)provision a development environment
	$(VAGRANT) up $(VAGRANT_UP_OPTS)
.PHONY: vagrantup


help: ## Show this help message
	@echo "The following targets are available:"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help


$(BUILD_ROOT)/package-build-container: packages/Dockerfile packages/entrypoint.sh
	mkdir -p $(dir $@)
	rm -f $@
	docker build -t $(PACKAGE_BUILD_IMAGE) -f $< $(dir $<)
	touch $@

$(BUILD_ROOT)/packages/calico-cni-plugin/calico-cni-plugin.meta: packages/calico-cni-plugin.spec | $(PACKAGE_BUILD_CONTAINER)
	mkdir -p $(dir $@)
	rm -f $@
	docker run \
		--hostname build \
		--mount type=bind,source=$(PWD)/$<,destination=/rpmbuild/SPECS/$(notdir $<),ro \
		--read-only \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		su -l build -c "rpmspec -P /rpmbuild/SPECS/$(notdir $<)" > $@ || (rm -f $@; false)

$(foreach src,$(CALICO_CNI_PLUGIN_SOURCES),$(BUILD_ROOT)/packages/calico-cni-plugin/SOURCES/$(src)): $(BUILD_ROOT)/packages/calico-cni-plugin/calico-cni-plugin.meta
	mkdir -p $(dir $@)
	curl -L -o "$@" "$(shell awk '/^Source[0-9]+:.*\/$(notdir $@)$$/ { print $$2 }' < $<)"

$(BUILD_ROOT)/packages/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.src.rpm: packages/calico-cni-plugin.spec
$(BUILD_ROOT)/packages/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.src.rpm: $(foreach src,$(CALICO_CNI_PLUGIN_SOURCES),$(BUILD_ROOT)/packages/calico-cni-plugin/SOURCES/$(src))
$(BUILD_ROOT)/packages/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.src.rpm: | $(PACKAGE_BUILD_CONTAINER)
$(BUILD_ROOT)/packages/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.src.rpm:
	mkdir -p $(dir $@)
	docker run \
		--env SPEC=$(notdir $<) \
		--env SRPM=$(notdir $@) \
		--env SOURCES="$(CALICO_CNI_PLUGIN_SOURCES)" \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(PWD)/$<,destination=/rpmbuild/SPECS/$(notdir $<),ro \
		--mount type=bind,source=$(BUILD_ROOT)/packages/calico-cni-plugin/SOURCES/v$(CALICO_CNI_PLUGIN_VERSION).tar.gz,destination=/rpmbuild/SOURCES/v$(CALICO_CNI_PLUGIN_VERSION).tar.gz,ro \
		--mount type=bind,source=$(BUILD_ROOT)/packages/calico-cni-plugin/SOURCES/calico-amd64,destination=/rpmbuild/SOURCES/calico-amd64,ro \
		--mount type=bind,source=$(BUILD_ROOT)/packages/calico-cni-plugin/SOURCES/calico-ipam-amd64,destination=/rpmbuild/SOURCES/calico-ipam-amd64,ro \
		--mount type=bind,source=$(dir $@),destination=/rpmbuild/SRPMS \
		--mount type=bind,source=$(PWD)/packages/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--mount type=bind,source=$(PWD)/packages/entrypoint.sh,destination=/entrypoint.sh,ro \
		--read-only \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		/entrypoint.sh buildsrpm

$(SCALITY_EL7_ROOT)/x86_64/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm: $(BUILD_ROOT)/packages/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.src.rpm
$(SCALITY_EL7_ROOT_/x86_64/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm: | $(PACKAGE_BUILD_CONTAINER)
$(SCALITY_EL7_ROOT)/x86_64/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm:
	mkdir -p $(dir $@)
	# Note: because we use `yum-builddep`, this one can't be `--read-only`
	docker run \
		--env RPMS="x86_64/$(notdir $@)" \
		--env SRPM=$(notdir $<) \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$<,destination=/rpmbuild/SRPMS/$(notdir $<),ro \
		--mount type=bind,source=$(dir $@),destination=/rpmbuild/RPMS \
		--mount type=bind,source=$(PWD)/packages/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--mount type=bind,source=$(PWD)/packages/entrypoint.sh,destination=/entrypoint.sh,ro \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		/entrypoint.sh buildrpm

$(SCALITY_EL7_REPODATA): $(SCALITY_EL7_RPMS) | $(PACKAGE_BUILD_CONTAINER)
	mkdir -p $(dir $@)
	docker run \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(SCALITY_EL7_ROOT),destination=/repository,ro \
		--mount type=bind,source=$(dir $@),destination=/repository/repodata \
		--mount type=bind,source=$(PWD)/packages/entrypoint.sh,destination=/entrypoint.sh,ro \
		--read-only \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		/entrypoint.sh buildrepo
