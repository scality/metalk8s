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
	sed s/@VERSION@/$(VERSION)/g < $< > $@ || rm -f $@
	chmod a+x $@

$(ISO_ROOT)/salt/%: salt/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp -a $< $@

$(ISO_ROOT)/pillar/top.sls: pillar/top.sls.in
	mkdir -p $(shell dirname $@)
	rm -f $@
	sed s/@VERSION@/$(VERSION)/g < $< > $@ || rm -f $@

$(ISO_ROOT)/pillar/%: pillar/%
	mkdir -p $(shell dirname $@)
	rm -f $@
	cp -a $< $@

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
		$(ISO_ROOT)
.PHONY: $(ISO)
