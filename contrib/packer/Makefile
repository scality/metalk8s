.POSIX:

MAKEFLAGS += -r
.DEFAULT_GOAL := default
.DELETE_ON_ERROR:
.SUFFIXES:

default: help
.PHONY: default

PACKER = packer
PACKER_TEMPLATE = metal-k8s.json

BOXES = box-virtualbox

V=@

INCLUDES = ansible/extra-vars.yml \
	   box/info.json \
	   box/Vagrantfile.template \
	   http/kickstart.cfg \
	   scripts/install-virtualbox-guest-additions.sh \
	   scripts/configure-vagrant.sh \
	   scripts/create-temporary-admin-conf.sh \
	   scripts/remove-temporary-admin-conf.sh \
	   scripts/clean.sh

check-packer:
	$(V)echo '' | $(PACKER) version 2>/dev/null | grep ^Packer >/dev/null 2>&1 || \
		( echo "$(PACKER) doesn't look like Hashicorp Packer"; false )
.PHONY: check-packer

builds/packer_virtualbox-iso_virtualbox.box: $(PACKER_TEMPLATE) $(INCLUDES)
	$(V)$(MAKE) check-packer
	$(V)rm -f build/admin.conf
	$(V)$(PACKER) build -only=virtualbox-iso $(PACKER_TEMPLATE)

box-virtualbox: builds/packer_virtualbox-iso_virtualbox.box ## Build Vagrant box for VirtualBox using Packer
.PHONY: box-virtualbox

boxes: $(BOXES) ## Build Vagrant boxes using Packer
.PHONY: boxes

help: ## Show this help message
	$(V)echo "The following targets are available:"
	$(V)echo
	$(V)grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help
