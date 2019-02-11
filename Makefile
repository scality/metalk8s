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

all: $(ALL)
.PHONY: all

$(ISO_ROOT)/bootstrap.sh: scripts/bootstrap.sh.in
	mkdir -p $(shell dirname $@)
	rm -f $@
	cat $< | sed s/@VERSION@/$(VERSION)/g > $@ || rm -f $@
	chmod a+x $@

$(ISO_ROOT)/salt/%: salt/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp --archive $< $@

$(ISO_ROOT)/pillar/top.sls: pillar/top.sls.in
	mkdir -p $(shell dirname $@)
	rm -f $@
	cat $< | sed s/@VERSION@/$(VERSION)/g >$@ || rm -f $@

$(ISO_ROOT)/pillar/%: pillar/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp --archive $< $@

clean:
	rm -rf $(BUILD_ROOT)
.PHONY: clean

iso: $(ISO)
.PHONY: iso

$(ISO): all
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
.PHONY: $(ISO)



# Package building
PACKAGES_DOCKER_IMAGE ?= metalk8s-build
$(PACKAGES_DOCKER_IMAGE):
	docker build -t $(PACKAGES_DOCKER_IMAGE) -f packages/Dockerfile packages/
.PHONY: $(PACKAGES_DOCKER_IMAGE)

MOCK_ROOT ?= $(BUILD_ROOT)/mock

RPMBUILD_ROOT ?= $(BUILD_ROOT)/rpmbuild
RPMBUILD_SOURCES := $(RPMBUILD_ROOT)/SOURCES
RPMBUILD_SRPMS := $(RPMBUILD_ROOT)/SRPMS
RPMBUILD_RPMS := $(RPMBUILD_ROOT)/RPMS

# Either we 'generate' parts of the Makefile dynamically, or we generate parts
# of it as files using some script(s), keep those in VCS and `include` them
# here.
SPECTOOL := $(shell command -v spectool 2>/dev/null)

ifndef SPECTOOL
CALICO_CNI_PLUGIN_SOURCES_LIST = $(shell \
		docker run \
			--hostname build \
			--mount type=bind,source=$(PWD)/packages/calico-cni-plugin.spec,destination=/home/build/rpmbuild/SPECS/calico-cni-plugin.spec,ro \
			--name metalk8s-build-calico-cni-plugin \
			--rm \
			$(PACKAGES_DOCKER_IMAGE) \
			/usr/bin/spectool \
				--list-files \
				--sources \
				/home/build/rpmbuild/SPECS/calico-cni-plugin.spec | awk '{ print $$2 }' | xargs -l basename)
else
CALICO_CNI_PLUGIN_SOURCES_LIST = $(shell \
		$(SPECTOOL) \
			--list-files \
			--sources \
			$(PWD)/packages/calico-cni-plugin.spec | awk '{ print $$2 }' | xargs -l basename)
endif

CALICO_CNI_PLUGIN_SOURCES = $(foreach src,$(CALICO_CNI_PLUGIN_SOURCES_LIST),$(RPMBUILD_SOURCES)/$(src))

$(CALICO_CNI_PLUGIN_SOURCES): packages/calico-cni-plugin.spec
	$(MAKE) $(PACKAGES_DOCKER_IMAGE)
	mkdir -p $(notdir $@)
	docker run \
		--hostname build \
		--mount type=bind,source=$(PWD)/$<,destination=/home/build/rpmbuild/SPECS/$(notdir $<),ro \
		--mount type=bind,source=$(RPMBUILD_SOURCES),destination=/home/build/rpmbuild/SOURCES \
		--name metalk8s-build-calico-cni-plugin \
		--rm \
		$(PACKAGES_DOCKER_IMAGE) \
		/usr/bin/spectool \
			--get-files \
			--directory /home/build/rpmbuild/SOURCES \
			/home/build/rpmbuild/SPECS/$(notdir $<)
	touch $@

$(RPMBUILD_SRPMS)/calico-cni-plugin-3.4.0-1.el7.src.rpm: packages/calico-cni-plugin.spec $(CALICO_CNI_PLUGIN_SOURCES)
	$(MAKE) $(PACKAGES_DOCKER_IMAGE)
	mkdir -p $(MOCK_ROOT)/lib $(MOCK_ROOT)/cache
	mkdir -p $(RPMBUILD_SRPMS)
	docker run \
		--cap-add SYS_ADMIN \
		--hostname build \
		--mount type=bind,source=$(MOCK_ROOT)/lib,destination=/var/lib/mock \
		--mount type=bind,source=$(MOCK_ROOT)/cache,destination=/var/cache/mock \
		--mount type=bind,source=$(PWD)/$<,destination=/home/build/rpmbuild/SPECS/$(notdir $<),ro \
		--mount type=bind,source=$(RPMBUILD_SOURCES)/v3.4.0.tar.gz,destination=/home/build/rpmbuild/SOURCES/v3.4.0.tar.gz,ro \
		--mount type=bind,source=$(RPMBUILD_SOURCES)/calico-amd64,destination=/home/build/rpmbuild/SOURCES/calico-amd64,ro \
		--mount type=bind,source=$(RPMBUILD_SOURCES)/calico-ipam-amd64,destination=/home/build/rpmbuild/SOURCES/calico-ipam-amd64,ro \
		--mount type=bind,source=$(RPMBUILD_SRPMS),destination=/home/build/rpmbuild/SRPMS \
		--mount type=tmpfs,destination=/tmp \
		--name metalk8s-build-calico-cni-plugin \
		--rm \
		$(PACKAGES_DOCKER_IMAGE) \
		/usr/bin/mock \
			--root centos-7-x86_64 \
			--buildsrpm \
			--spec=/home/build/rpmbuild/SPECS/$(notdir $<) \
			--sources=/home/build/rpmbuild/SOURCES/ \
			--resultdir=/home/build/rpmbuild/SRPMS \
			--verbose

$(RPMBUILD_RPMS)/calico-cni-plugin-3.4.0-1.el7.x86_64.rpm: $(RPMBUILD_SRPMS)/calico-cni-plugin-3.4.0-1.el7.src.rpm
	$(MAKE) $(PACKAGES_DOCKER_IMAGE)
	mkdir -p $(MOCK_ROOT)/lib $(MOCK_ROOT)/cache
	mkdir -p $(RPMBUILD_RPMS)
	docker run \
		--cap-add SYS_ADMIN \
		--hostname build \
		--mount type=bind,source=$(MOCK_ROOT)/lib,destination=/var/lib/mock \
		--mount type=bind,source=$(MOCK_ROOT)/cache,destination=/var/cache/mock \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$<,destination=/home/build/rpmbuild/SRPMS/$(notdir $<),ro \
		--mount type=bind,source=$(RPMBUILD_RPMS),destination=/home/build/rpmbuild/RPMS \
		--name metalk8s-build-calico-cni-plugin \
		--rm \
		$(PACKAGES_DOCKER_IMAGE) \
		/usr/bin/mock \
			--root centos-7-x86_64 \
			--rebuild \
			--resultdir=/home/build/rpmbuild/RPMS \
			--verbose \
			/home/build/rpmbuild/SRPMS/$(notdir $<)

ALL_RPMS = \
	   $(RPMBUILD_RPMS)/calico-cni-plugin-3.4.0-1.el7.x86_64.rpm \

packages: $(ALL_RPMS)
.PHONY: packages
