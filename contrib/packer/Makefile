.POSIX:

MAKEFLAGS += -r
.DEFAULT_GOAL := default
.DELETE_ON_ERROR:
.SUFFIXES:

default: help
.PHONY: default

PACKER = packer
PACKER_TEMPLATE = metal-k8s.json

V=@

check-packer:
	$(V)echo '' | $(PACKER) version 2>/dev/null | grep ^Packer >/dev/null 2>&1 || \
		( echo "$(PACKER) doesn't look like Hashicorp Packer"; false )
.PHONY: check-packer

box: check-packer $(PACKER_TEMPLATE) ## Build a Vagrant Box using Packer
	$(V)$(PACKER) build $(PACKER_TEMPLATE)
.PHONY: box

help: ## Show this help message
	$(V)echo "The following targets are available:"
	$(V)echo
	$(V)grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help
