.POSIX:

MAKEFLAGS += -r
.DEFAULT_GOAL := default
.DELETE_ON_ERROR:
.SUFFIXES:

default: help
.PHONY: default

VIRTUALENV_SRC = https://files.pythonhosted.org/packages/b1/72/2d70c5a1de409ceb3a27ff2ec007ecdd5cc52239e7c74990e32af57affe9/virtualenv-15.2.0.tar.gz
VIRTUALENV_SRC_SHA256SUM = 1d7e241b431e7afce47e77f8843a276f652699d1fa4f93b9d8ce0076fd7b0b54

KUBECTL_VERSION = 1.10.1
KUBECTL_BIN_SHA256SUM.linux = 1bb4d3793fb0f9e1cfee86599e0f43ae5f15578a01b61011fe7c9488e114a00b
KUBECTL_BIN_SHA256SUM.darwin = 9484fd8a0cba513ab91fc192f6b6659d700f411502d01a7e02acb9f3b986037c

HELM_VERSION = 2.8.2
HELM_SRC_SHA256SUM.linux = 614b5ac79de4336b37c9b26d528c6f2b94ee6ccacb94b0f4b8d9583a8dd122d3
HELM_SRC_SHA256SUM.darwin = a0a8cf462080b2bc391f38b7cf617618b189cdef9f071c06fa0068c2418cc413
HELM_BIN_SHA256SUM.linux = 0521956fa22be33189cc825bb27b3f4178c5ce9a448368b5c81508d446472715
HELM_BIN_SHA256SUM.darwin = 49c0f595f1c02c466191aa41143d623b553cc0d1fc2c92ab41984699aa3d0317

V=@

uname_kernel = uname -s | tr '[:upper:]' '[:lower:]'
uname_machine = uname -m | sed 's/^x86_64$$/amd64/'
UNAME_KERNEL = $(shell $(uname_kernel))$(uname_kernel:sh)
UNAME_MACHINE = $(shell $(uname_machine))$(uname_machine:sh)

KUBECTL_SRC = https://storage.googleapis.com/kubernetes-release/release/v$(KUBECTL_VERSION)/bin/$(UNAME_KERNEL)/$(UNAME_MACHINE)/kubectl
KUBECTL_BIN_SHA256SUM = $(KUBECTL_BIN_SHA256SUM.$(UNAME_KERNEL))
HELM_SRC = https://storage.googleapis.com/kubernetes-helm/helm-v$(HELM_VERSION)-$(UNAME_KERNEL)-$(UNAME_MACHINE).tar.gz
HELM_SRC_SHA256SUM = $(HELM_SRC_SHA256SUM.$(UNAME_KERNEL))
HELM_BIN_SHA256SUM = $(HELM_BIN_SHA256SUM.$(UNAME_KERNEL))

PYTHON = python

SHELL_ENV = .shell-env

SHELL_ENV_EXISTS = $(SHELL_ENV)/.exists
$(SHELL_ENV_EXISTS):
	$(V)mkdir -p $(SHELL_ENV)
	$(V)touch $@

VIRTUALENV_SRC_BASENAME = basename $(VIRTUALENV_SRC)
PYTHON_VIRTUALENV_SRC = $(SHELL_ENV)/$(shell $(VIRTUALENV_SRC_BASENAME))$(VIRTUALENV_SRC_BASENAME:sh)
$(PYTHON_VIRTUALENV_SRC): $(SHELL_ENV_EXISTS)
	$(V)rm -f $@.tmp
	$(V)$(PYTHON) hack/download.py $(VIRTUALENV_SRC) $@.tmp
	$(V)echo $(VIRTUALENV_SRC_SHA256SUM)  $@.tmp | $(PYTHON) hack/sha256sum.py -c > /dev/null
	$(V)mv $@.tmp $@

PYTHON_VIRTUALENV_SRC_BASENAME = basename $(PYTHON_VIRTUALENV_SRC) .tar.gz
PYTHON_VIRTUALENV_SRC_DIRNAME = dirname $(PYTHON_VIRTUALENV)
PYTHON_VIRTUALENV = $(SHELL_ENV)/$(shell $(PYTHON_VIRTUALENV_SRC_BASENAME))$(PYTHON_VIRTUALENV_SRC_BASENAME:sh)
PYTHON_VIRTUALENV_EXISTS = $(PYTHON_VIRTUALENV)/.exists
$(PYTHON_VIRTUALENV_EXISTS): $(SHELL_ENV_EXISTS) $(PYTHON_VIRTUALENV_SRC)
	$(V)rm -rf $(PYTHON_VIRTUALENV)
	$(V)tar -xf $(PYTHON_VIRTUALENV_SRC) -C $(shell $(PYTHON_VIRTUALENV_SRC_DIRNAME))$(PYTHON_VIRTUALENV_SRC_DIRNAME:sh)
	$(V)touch $@

VENV = $(SHELL_ENV)/metal-k8s
VENV_BIN = $(VENV)/bin
VENV_ACTIVATE = $(VENV_BIN)/activate

VENV_EXISTS = $(VENV)/.exists
$(VENV_EXISTS): $(PYTHON_VIRTUALENV_EXISTS)
	$(V)rm -rf $(VENV)
	$(V)echo "Creating virtualenv..."
	$(V)PYTHONPATH=$(PYTHON_VIRTUALENV) $(PYTHON) -m virtualenv $(VENV) > /dev/null
	$(V)touch $@

REQUIREMENTS_INSTALLED = $(SHELL_ENV)/.requirements_installed
$(REQUIREMENTS_INSTALLED): $(VENV_EXISTS) requirements.txt
	$(V)echo "Installing Python dependencies..."
	$(V). $(VENV_ACTIVATE) && pip install -r requirements.txt > /dev/null
	$(V)touch $@

KUBECTL_BIN = $(SHELL_ENV)/kubectl-$(KUBECTL_VERSION)
$(KUBECTL_BIN): $(SHELL_ENV_EXISTS)
	$(V)rm -f $@.tmp
	$(V)echo "Downloading kubectl..."
	$(V)$(PYTHON) hack/download.py $(KUBECTL_SRC) $@.tmp
	$(V)echo $(KUBECTL_BIN_SHA256SUM)  $@.tmp | $(PYTHON) hack/sha256sum.py -c > /dev/null
	$(V)chmod a+x $@.tmp
	$(V)mv $@.tmp $@

KUBECTL = $(VENV_BIN)/kubectl
KUBECTL_REALPATH = realpath $(KUBECTL_BIN)
$(KUBECTL): $(KUBECTL_BIN) $(VENV_EXISTS)
	$(V)ln -sf $(shell $(KUBECTL_REALPATH))$(KUBECTL_REALPATH:sh) $@

HELM_SRC_BASENAME = basename $(HELM_SRC)
HELM_SRC_TAR = $(SHELL_ENV)/$(shell $(HELM_SRC_BASENAME))$(HELM_SRC_BASENAME:sh)
$(HELM_SRC_TAR): $(SHELL_ENV_EXISTS)
	$(V)rm -f $@.tmp
	$(V)echo "Downloading Helm..."
	$(V)$(PYTHON) hack/download.py $(HELM_SRC) $@.tmp
	$(V)echo $(HELM_SRC_SHA256SUM)  $@.tmp | $(PYTHON) hack/sha256sum.py -c > /dev/null
	$(V)mv $@.tmp $@

HELM_BIN = $(SHELL_ENV)/helm-$(HELM_VERSION)
$(HELM_BIN): $(HELM_SRC_TAR) $(SHELL_ENV_EXISTS)
	$(V)rm -f $(SHELL_ENV)/$(UNAME_KERNEL)-$(UNAME_MACHINE)/helm
	$(V)tar -xf $(HELM_SRC_TAR) -C $(SHELL_ENV) $(UNAME_KERNEL)-$(UNAME_MACHINE)/helm
	$(V)echo $(HELM_BIN_SHA256SUM)  $(SHELL_ENV)/$(UNAME_KERNEL)-$(UNAME_MACHINE)/helm | $(PYTHON) hack/sha256sum.py -c > /dev/null
	$(V)mv $(SHELL_ENV)/$(UNAME_KERNEL)-$(UNAME_MACHINE)/helm $@
	$(V)touch $@

HELM = $(VENV_BIN)/helm
HELM_REALPATH = realpath $(HELM_BIN)
$(HELM): $(HELM_BIN) $(VENV_EXISTS)
	$(V)ln -sf $(shell $(HELM_REALPATH))$(HELM_REALPATH:sh) $@

BASHRC = $(SHELL_ENV)/bashrc
$(BASHRC): $(SHELL_ENV_EXISTS) hack/shell-bashrc
	$(V)rm -f $@
	$(V)sed s:@VENV_ACTIVATE@:$(VENV_ACTIVATE):g < hack/shell-bashrc > $@ || (rm -f $@; exit 1)

shell: $(VENV_EXISTS) $(REQUIREMENTS_INSTALLED) $(KUBECTL) $(HELM) $(BASHRC) ## Run a shell with `ansible-playbook`, `kubectl` and `helm` pre-installed
	$(V)echo "Launching metal-k8s shell environment. Run 'exit' to quit."
	$(V)bash --rcfile $(BASHRC) ||:
.PHONY: shell

clean-shell: ## Clean-up the `shell` environment
	$(V)rm -rf $(SHELL_ENV)
.PHONY: clean-shell

boxes: ## Build Vagrant boxes using Packer (see `contrib/packer/README.md`)
	$(V)$(MAKE) -C contrib/packer $@
.PHONY:  boxes

help: ## Show this help message
	$(V)echo "The following targets are available:"
	$(V)echo
	$(V)grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help
