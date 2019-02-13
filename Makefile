.POSIX:

MAKEFLAGS += -r
.DEFAULT_GOAL := default
.DELETE_ON_ERROR:
.SUFFIXES:

VERSION ?= 2.0
FULL_VERSION ?= 2.0.0-dev

PWD := $(shell pwd)

BUILD_ROOT ?= $(PWD)/_build
ISO_ROOT ?= $(BUILD_ROOT)/root
ISO ?= $(BUILD_ROOT)/metalk8s.iso

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


default: all
.PHONY: default

all: iso
.PHONY: all

all-local: $(ALL) ## Build all artifacts in the build tree
.PHONY: all-local

$(ISO_ROOT)/bootstrap.sh: scripts/bootstrap.sh.in
	mkdir -p $(shell dirname $@)
	rm -f $@
	sed s/@VERSION@/$(VERSION)/g < $< > $@ || rm -f $@
	chmod a+x $@

$(ISO_ROOT)/salt/%: salt/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp --archive $< $@

$(ISO_ROOT)/pillar/top.sls: pillar/top.sls.in
	mkdir -p $(shell dirname $@)
	rm -f $@
	sed s/@VERSION@/$(VERSION)/g < $< > $@ || rm -f $@

$(ISO_ROOT)/pillar/%: pillar/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp --archive $< $@

clean: ## Clean the build tree
	rm -rf $(BUILD_ROOT)
.PHONY: clean

iso: $(ISO) ## Build the MetalK8s ISO image
.PHONY: iso

$(ISO): all-local
	mkisofs -output $@ \
		-rock \
		-joliet \
		-joliet-long \
		-full-iso9660-filenames \
		-volid 'MetalK8s $(FULL_VERSION)' \
		--iso-level 3 \
		-gid 0 \
		-uid 0 \
		-input-charset utf-8 \
		-output-charset utf-8 \
		-checksum_algorithm_iso md5,sha1,sha256,sha512 \
		$(ISO_ROOT)


VAGRANT ?= vagrant
VAGRANT_DEFAULT_PROVIDER ?= virtualbox
VAGRANT_UP_OPTS ?= --provision --no-destroy-on-error --parallel --provider=$(VAGRANT_DEFAULT_PROVIDER)

vagrantup: all-local ## Run 'vagrant up' to (re-)provision a development environment
	$(VAGRANT) up $(VAGRANT_UP_OPTS)
.PHONY: vagrantup


help: ## Show this help message
	@echo "The following targets are available:"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help
