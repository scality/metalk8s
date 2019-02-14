.POSIX:

MAKEFLAGS += -r
.DEFAULT_GOAL := default
.DELETE_ON_ERROR:
.SUFFIXES:

PWD := $(shell pwd)

BUILD_ROOT ?= $(PWD)/_build
ISO_ROOT ?= $(BUILD_ROOT)/root

PACKAGE_BUILD_CONTAINER := $(BUILD_ROOT)/package-build-container
PACKAGE_BUILD_IMAGE ?= metalk8s-build:latest

CALICO_CNI_PLUGIN_VERSION = 3.4.0
CALICO_CNI_PLUGIN_BUILD = 1
CALICO_CNI_PLUGIN_SOURCES = \
	v$(CALICO_CNI_PLUGIN_VERSION).tar.gz \
	calico-amd64 \
	calico-ipam-amd64 \

ALL = \
      $(ISO_ROOT)/packages/scality/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm \

default: all
.PHONY: default

all: $(ALL)
.PHONY: all


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
		--read-only \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		buildsrpm

$(ISO_ROOT)/packages/scality/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm: $(BUILD_ROOT)/packages/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.src.rpm
$(ISO_ROOT)/packages/scality/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm: | $(PACKAGE_BUILD_CONTAINER)
$(ISO_ROOT)/packages/scality/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm:
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
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		buildrpm
