.POSIX:

MAKEFLAGS += -r
.DEFAULT_GOAL := default
.DELETE_ON_ERROR:
.SUFFIXES:
SHELL := /bin/bash

include VERSION
include container_images.mk
include packages.mk

PWD := $(shell pwd)

BUILD_ROOT ?= $(PWD)/_build
ISO_ROOT ?= $(BUILD_ROOT)/root
ISO ?= $(BUILD_ROOT)/metalk8s.iso

CALICO_CNI_PLUGIN_VERSION = 3.5.1
CALICO_CNI_PLUGIN_BUILD = 1

ALL = \
	$(ISO_ROOT)/bootstrap.sh \
	\
	$(ISO_ROOT)/salt/metalk8s/orchestrate/bootstrap_without_master.sls \
	$(ISO_ROOT)/salt/metalk8s/orchestrate/bootstrap_with_master.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/addons.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/calico.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/certs/ca.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/certs/clients.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/control-plane.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/etcd.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/kubeconfig.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/kubelet_install.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/kubelet_start.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/kubernetes_client.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/mark_control_plane.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/precheck.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/preflight.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/registry.sls \
	$(ISO_ROOT)/salt/metalk8s/bootstrap/salt_master.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/calico/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/calico/deployed.sls \
	$(ISO_ROOT)/salt/metalk8s/calico/init.sls \
	$(ISO_ROOT)/salt/metalk8s/calico/installed.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/containerd/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/containerd/init.sls \
	$(ISO_ROOT)/salt/metalk8s/containerd/installed.sls \
	$(ISO_ROOT)/salt/metalk8s/containerd/files/pause-$(PAUSE_IMAGE_TAG).tar \
	\
	$(ISO_ROOT)/salt/metalk8s/defaults.yaml \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/apiserver.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/apiserver-etcd-client.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/apiserver-kubelet-client.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/ca.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/etcd-ca.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/etcd-healthcheck-client.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/etcd-peer.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/etcd-server.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/front-proxy-ca.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/front-proxy-client.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/installed.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/certs/sa.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/control-plane/apiserver.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/control-plane/controller-manager.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/control-plane/files/manifest.yaml \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/control-plane/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/control-plane/lib.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/control-plane/scheduler.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/etcd/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/etcd/files/manifest.yaml \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/etcd/local.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/init.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubelet-start/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubelet-start/files/kubeadm.env \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubelet-start/files/service-kubelet-systemd.conf \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubelet-start/init.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/preflight/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/preflight/mandatory.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/preflight/recommended.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubeconfig/admin.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubeconfig/controller-manager.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubeconfig/files/service-kubelet-systemd.conf \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubeconfig/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubeconfig/kubelet.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubeconfig/lib.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/kubeconfig/scheduler.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/mark-control-plane/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/mark-control-plane/configured.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/addons/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/addons/kube-proxy.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/addons/coredns.sls \
	$(ISO_ROOT)/salt/metalk8s/kubeadm/init/addons/files/coredns_deployment.yaml.j2 \
	\
	$(ISO_ROOT)/salt/metalk8s/kubelet/init.sls \
	$(ISO_ROOT)/salt/metalk8s/kubelet/installed.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/macro.sls \
	$(ISO_ROOT)/salt/metalk8s/map.jinja \
	\
	$(ISO_ROOT)/salt/metalk8s/python-kubernetes/init.sls \
	$(ISO_ROOT)/salt/metalk8s/python-kubernetes/installed.sls \
	$(ISO_ROOT)/salt/metalk8s/python-kubernetes/removed.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/repo/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/repo/deployed.sls \
	$(ISO_ROOT)/salt/metalk8s/repo/files/nginx.conf.j2 \
	$(ISO_ROOT)/salt/metalk8s/repo/files/package-repositories-pod.yaml.j2 \
	$(ISO_ROOT)/salt/metalk8s/repo/init.sls \
	$(ISO_ROOT)/salt/metalk8s/repo/offline.sls \
	$(ISO_ROOT)/salt/metalk8s/repo/online.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/runc/init.sls \
	$(ISO_ROOT)/salt/metalk8s/runc/installed.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/registry/init.sls \
	$(ISO_ROOT)/salt/metalk8s/registry/populated.sls \
	$(ISO_ROOT)/salt/metalk8s/registry/files/registry-pod.yaml.j2 \
	\
	$(ISO_ROOT)/salt/metalk8s/salt/master/files/master_99-metalk8s.conf.j2 \
	$(ISO_ROOT)/salt/metalk8s/salt/master/files/salt-master-pod.yaml.j2 \
	$(ISO_ROOT)/salt/metalk8s/salt/master/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/salt/master/deployed.sls \
	$(ISO_ROOT)/salt/metalk8s/salt/master/init.sls \
	$(ISO_ROOT)/salt/metalk8s/salt/master/accept_keys.sls \
	\
	$(ISO_ROOT)/salt/metalk8s/salt/minion/files/minion_99-metalk8s.conf.j2 \
	$(ISO_ROOT)/salt/metalk8s/salt/minion/configured.sls \
	$(ISO_ROOT)/salt/metalk8s/salt/minion/installed.sls \
	$(ISO_ROOT)/salt/metalk8s/salt/minion/running.sls \
	$(ISO_ROOT)/salt/metalk8s/salt/minion/init.sls \
	\
	$(ISO_ROOT)/salt/_modules/containerd.py \
	$(ISO_ROOT)/salt/_modules/cri.py \
	$(ISO_ROOT)/salt/_modules/docker_registry.py \
	$(ISO_ROOT)/salt/_modules/kubernetes.py \
	\
	$(ISO_ROOT)/salt/_pillar/metalk8s.py \
	\
	$(ISO_ROOT)/salt/_states/containerd.py \
	$(ISO_ROOT)/salt/_states/kubeconfig.py \
	$(ISO_ROOT)/salt/_states/docker_registry.py \
	$(ISO_ROOT)/salt/_states/kubernetes.py \
	\
	$(ISO_ROOT)/pillar/metalk8s.sls \
	$(ISO_ROOT)/pillar/repositories.sls \
	$(ISO_ROOT)/pillar/top.sls \
	\
	$(ISO_ROOT)/product.txt \
	\
	$(SCALITY_EL7_REPO) \
	$(YUM_PACKAGES_CACHE) \
	$(BASE_EL7_REPODATA) \
	$(EXTERNAL_EL7_REPODATA) \
	$(EXTRAS_EL7_REPODATA) \
	$(UPDATES_EL7_REPODATA) \
	$(EPEL_EL7_REPODATA) \
	$(KUBERNETES_EL7_REPODATA) \
	$(SALTSTACK_EL7_REPODATA) \
	\
	$(ISO_ROOT)/images/$(COREDNS_IMAGE_NAME)-$(COREDNS_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/$(ETCD_IMAGE_NAME)-$(ETCD_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/$(KUBE_APISERVER_IMAGE_NAME)-$(KUBE_APISERVER_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/$(KUBE_CONTROLLER_MANAGER_IMAGE_NAME)-$(KUBE_CONTROLLER_MANAGER_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/$(KUBE_PROXY_IMAGE_NAME)-$(KUBE_PROXY_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/$(KUBE_SCHEDULER_IMAGE_NAME)-$(KUBE_SCHEDULER_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/$(CALICO_NODE_IMAGE_NAME)-$(CALICO_NODE_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/$(NGINX_IMAGE_NAME)-$(NGINX_IMAGE_VERSION).tar.gz \
	$(ISO_ROOT)/images/registry-$(REGISTRY_IMAGE_TAG).tar \
	$(ISO_ROOT)/images/$(SALT_MASTER_IMAGE_NAME)-$(SALT_MASTER_IMAGE_VERSION).tar.gz \


PACKAGE_BUILD_CONTAINER := $(BUILD_ROOT)/package-build-container
PACKAGE_BUILD_IMAGE ?= metalk8s-build:latest

CALICO_CNI_PLUGIN_SOURCES = \
	v$(CALICO_CNI_PLUGIN_VERSION).tar.gz \
	calico-amd64 \
	calico-ipam-amd64 \

REPOSITORY_NAME_PREFIX = metalk8s-

SCALITY_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)scality-el7
SCALITY_EL7_RPMS = \
	$(SCALITY_EL7_ROOT)/x86_64/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm \

SCALITY_EL7_REPODATA = $(SCALITY_EL7_ROOT)/repodata/repomd.xml
SCALITY_EL7_REPO = $(SCALITY_EL7_RPMS) $(SCALITY_EL7_REPODATA)

YUM_PACKAGES_CACHE = $(BUILD_ROOT)/packages/var/cache/yum/x86_64/7

BASE_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)base-el7
BASE_EL7_REPODATA = $(BASE_EL7_ROOT)/repodata/repomd.xml

EXTERNAL_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)external-el7
EXTERNAL_EL7_REPODATA = $(EXTERNAL_EL7_ROOT)/repodata/repomd.xml

EXTRAS_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)extras-el7
EXTRAS_EL7_REPODATA = $(EXTRAS_EL7_ROOT)/repodata/repomd.xml

UPDATES_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)updates-el7
UPDATES_EL7_REPODATA = $(UPDATES_EL7_ROOT)/repodata/repomd.xml

EPEL_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)epel-el7
EPEL_EL7_REPODATA = $(EPEL_EL7_ROOT)/repodata/repomd.xml

KUBERNETES_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)kubernetes-el7
KUBERNETES_EL7_REPODATA = $(KUBERNETES_EL7_ROOT)/repodata/repomd.xml

SALTSTACK_EL7_ROOT = $(ISO_ROOT)/packages/$(REPOSITORY_NAME_PREFIX)saltstack-el7
SALTSTACK_EL7_REPODATA = $(SALTSTACK_EL7_ROOT)/repodata/repomd.xml

default: all
.PHONY: default

all: $(ISO)
.PHONY: all

all-local: $(ALL) ## Build all artifacts in the build tree
.PHONY: all-local

$(ISO_ROOT)/bootstrap.sh: scripts/bootstrap.sh.in $(ISO_ROOT)/product.txt
	mkdir -p $(@D)
	rm -f $@
	sed s/@VERSION@/$(shell source $(ISO_ROOT)/product.txt && echo $$SHORT_VERSION)/g < $< > $@ || (rm -f $@; false)
	chmod a+x $@

$(ISO_ROOT)/salt/%: salt/%
	mkdir -p $(@D)
	rm -f $@
	cp -a $< $@

$(ISO_ROOT)/pillar/metalk8s.sls: pillar/metalk8s.sls.in $(ISO_ROOT)/product.txt
	mkdir -p $(@D)
	rm -f $@
	sed s/@VERSION@/$(shell source $(ISO_ROOT)/product.txt && echo $$SHORT_VERSION)/g < $< > $@ || (rm -f $@; false)

$(ISO_ROOT)/pillar/top.sls: pillar/top.sls.in $(ISO_ROOT)/product.txt
	mkdir -p $(@D)
	rm -f $@
	sed s/@VERSION@/$(shell source $(ISO_ROOT)/product.txt && echo $$SHORT_VERSION)/g < $< > $@ || (rm -f $@; false)

$(ISO_ROOT)/pillar/%: pillar/%
	mkdir -p $(@D)
	rm -f $@
	cp -a $< $@

$(ISO_ROOT)/product.txt: scripts/product.sh VERSION FORCE
	rm -f $@
	mkdir -p $(@D)
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
		-quiet \
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
	cd $$(dirname $@) && sha256sum $(notdir $@) > SHA256SUM


VAGRANT ?= vagrant
VAGRANT_DEFAULT_PROVIDER ?= virtualbox
VAGRANT_UP_OPTS ?= --provision --no-destroy-on-error --parallel --provider=$(VAGRANT_DEFAULT_PROVIDER)

vagrantup: $(ALL) ## Run 'vagrant up' to (re-)provision a development environment
	$(VAGRANT) up $(VAGRANT_UP_OPTS)
.PHONY: vagrantup


help: ## Show this help message
	@echo "The following targets are available:"
	@echo
	@grep -Eh '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
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
	curl -s -L -o "$@" "$(shell awk '/^Source[0-9]+:.*\/$(notdir $@)$$/ { print $$2 }' < $<)"

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
$(SCALITY_EL7_ROOT)/x86_64/calico-cni-plugin-$(CALICO_CNI_PLUGIN_VERSION)-$(CALICO_CNI_PLUGIN_BUILD).el7.x86_64.rpm: | $(PACKAGE_BUILD_CONTAINER)
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


$(YUM_PACKAGES_CACHE): | $(PACKAGE_BUILD_CONTAINER)
	docker run \
		--env RELEASEVER=7 \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(BUILD_ROOT)/packages,destination=/install_root \
		--mount type=bind,source=$(ISO_ROOT)/packages,destination=/repositories \
		--mount type=bind,source=$(PWD)/packages/entrypoint.sh,destination=/entrypoint.sh,ro \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		/entrypoint.sh download_packages $(YUM_PACKAGES)

$(BASE_EL7_REPODATA): REPOSITORY_ROOT = $(BASE_EL7_ROOT)
$(EXTERNAL_EL7_REPODATA): REPOSITORY_ROOT = $(EXTERNAL_EL7_ROOT)
$(EXTRAS_EL7_REPODATA): REPOSITORY_ROOT = $(EXTRAS_EL7_ROOT)
$(UPDATES_EL7_REPODATA): REPOSITORY_ROOT = $(UPDATES_EL7_ROOT)
$(EPEL_EL7_REPODATA): REPOSITORY_ROOT = $(EPEL_EL7_ROOT)
$(KUBERNETES_EL7_REPODATA): REPOSITORY_ROOT = $(KUBERNETES_EL7_ROOT)
$(SALTSTACK_EL7_REPODATA): REPOSITORY_ROOT = $(SALTSTACK_EL7_ROOT)
$(BASE_EL7_REPODATA) $(EXTERNAL_EL7_REPODATA) $(EXTRAS_EL7_REPODATA) $(UPDATES_EL7_REPODATA) $(EPEL_EL7_REPODATA) $(KUBERNETES_EL7_REPODATA) $(SALTSTACK_EL7_REPODATA): | $(PACKAGE_BUILD_CONTAINER)
	mkdir -p $(@D)
	docker run \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(REPOSITORY_ROOT),destination=/repository,ro \
		--mount type=bind,source=$(@D),destination=/repository/repodata \
		--mount type=bind,source=$(PWD)/packages/entrypoint.sh,destination=/entrypoint.sh,ro \
		--read-only \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		/entrypoint.sh buildrepo


DOCKER ?= docker

$(ISO_ROOT)/images/$(COREDNS_IMAGE_NAME)-$(COREDNS_IMAGE_VERSION).tar.gz: \
	IMAGE = $(COREDNS_IMAGE)
$(ISO_ROOT)/images/$(COREDNS_IMAGE_NAME)-$(COREDNS_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(COREDNS_IMAGE_NAME):$(COREDNS_IMAGE_VERSION)
$(ISO_ROOT)/images/$(ETCD_IMAGE_NAME)-$(ETCD_IMAGE_VERSION).tar.gz: \
	IMAGE = $(ETCD_IMAGE)
$(ISO_ROOT)/images/$(ETCD_IMAGE_NAME)-$(ETCD_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(ETCD_IMAGE_NAME):$(ETCD_IMAGE_VERSION)
$(ISO_ROOT)/images/$(KUBE_APISERVER_IMAGE_NAME)-$(KUBE_APISERVER_IMAGE_VERSION).tar.gz:	\
	IMAGE = $(KUBE_APISERVER_IMAGE)
$(ISO_ROOT)/images/$(KUBE_APISERVER_IMAGE_NAME)-$(KUBE_APISERVER_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(KUBE_APISERVER_IMAGE_NAME):$(KUBE_APISERVER_IMAGE_VERSION)
$(ISO_ROOT)/images/$(KUBE_CONTROLLER_MANAGER_IMAGE_NAME)-$(KUBE_CONTROLLER_MANAGER_IMAGE_VERSION).tar.gz: \
	IMAGE = $(KUBE_CONTROLLER_MANAGER_IMAGE)
$(ISO_ROOT)/images/$(KUBE_CONTROLLER_MANAGER_IMAGE_NAME)-$(KUBE_CONTROLLER_MANAGER_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(KUBE_CONTROLLER_MANAGER_IMAGE_NAME):$(KUBE_CONTROLLER_MANAGER_IMAGE_VERSION)
$(ISO_ROOT)/images/$(KUBE_PROXY_IMAGE_NAME)-$(KUBE_PROXY_IMAGE_VERSION).tar.gz:	\
	IMAGE = $(KUBE_PROXY_IMAGE)
$(ISO_ROOT)/images/$(KUBE_PROXY_IMAGE_NAME)-$(KUBE_PROXY_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(KUBE_PROXY_IMAGE_NAME):$(KUBE_PROXY_IMAGE_VERSION)
$(ISO_ROOT)/images/$(KUBE_SCHEDULER_IMAGE_NAME)-$(KUBE_SCHEDULER_IMAGE_VERSION).tar.gz:	\
	IMAGE = $(KUBE_SCHEDULER_IMAGE)
$(ISO_ROOT)/images/$(KUBE_SCHEDULER_IMAGE_NAME)-$(KUBE_SCHEDULER_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(KUBE_SCHEDULER_IMAGE_NAME):$(KUBE_SCHEDULER_IMAGE_VERSION)
$(ISO_ROOT)/images/$(CALICO_NODE_IMAGE_NAME)-$(CALICO_NODE_IMAGE_VERSION).tar.gz: \
	IMAGE = $(CALICO_NODE_IMAGE)
$(ISO_ROOT)/images/$(CALICO_NODE_IMAGE_NAME)-$(CALICO_NODE_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(CALICO_NODE_IMAGE_NAME):$(CALICO_NODE_IMAGE_VERSION)
$(ISO_ROOT)/images/$(NGINX_IMAGE_NAME)-$(NGINX_IMAGE_VERSION).tar.gz: \
	IMAGE = $(NGINX_IMAGE)
$(ISO_ROOT)/images/$(NGINX_IMAGE_NAME)-$(NGINX_IMAGE_VERSION).tar.gz: \
	IMAGE_TAG = $(NGINX_IMAGE_NAME):$(NGINX_IMAGE_VERSION)
$(ISO_ROOT)/images/$(SALT_MASTER_IMAGE_NAME)-$(SALT_MASTER_IMAGE_VERSION).tar.gz: \
	images/salt-master/Dockerfile images/salt-master/source.key
	mkdir -p $(dir $@)
	docker build -t $(SALT_MASTER_IMAGE_NAME):$(SALT_MASTER_IMAGE_VERSION) \
		--build-arg SALT_VERSION=$(SALT_MASTER_IMAGE_SALT_VERSION) \
		images/salt-master
	docker save $(SALT_MASTER_IMAGE_NAME):$(SALT_MASTER_IMAGE_VERSION) | gzip > $@
$(ISO_ROOT)/images/%.tar.gz:
	mkdir -p $(@D)
	$(DOCKER) pull $(IMAGE)
	$(DOCKER) tag $(IMAGE) $(IMAGE_TAG)
	$(DOCKER) save $(IMAGE_TAG) | gzip > $@

$(ISO_ROOT)/salt/metalk8s/containerd/files/pause-$(PAUSE_IMAGE_TAG).tar: IMAGE_NAME=$(PAUSE_IMAGE_NAME)
$(ISO_ROOT)/salt/metalk8s/containerd/files/pause-$(PAUSE_IMAGE_TAG).tar: IMAGE_TAG=$(PAUSE_IMAGE_TAG)
$(ISO_ROOT)/salt/metalk8s/containerd/files/pause-$(PAUSE_IMAGE_TAG).tar: IMAGE_DIGEST=$(PAUSE_IMAGE_DIGEST)

$(ISO_ROOT)/images/registry-$(REGISTRY_IMAGE_TAG).tar: IMAGE_NAME=$(REGISTRY_IMAGE_NAME)
$(ISO_ROOT)/images/registry-$(REGISTRY_IMAGE_TAG).tar: IMAGE_TAG=$(REGISTRY_IMAGE_TAG)
$(ISO_ROOT)/images/registry-$(REGISTRY_IMAGE_TAG).tar: IMAGE_DIGEST=$(REGISTRY_IMAGE_DIGEST)

$(ISO_ROOT)/images/%.tar $(ISO_ROOT)/salt/metalk8s/containerd/files/%.tar:
	mkdir -p $(dir $@)
	$(DOCKER) pull $(IMAGE_NAME)@$(IMAGE_DIGEST)
	$(DOCKER) tag $(IMAGE_NAME)@$(IMAGE_DIGEST) $(IMAGE_NAME):$(IMAGE_TAG)
	$(DOCKER) save $(IMAGE_NAME):$(IMAGE_TAG) > $@ || (rm -f $@; false)

#
# Lint targets
#

include make/lint.mk
