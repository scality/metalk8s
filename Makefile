.POSIX:

VIRTUALENV_SRC := https://files.pythonhosted.org/packages/b1/72/2d70c5a1de409ceb3a27ff2ec007ecdd5cc52239e7c74990e32af57affe9/virtualenv-15.2.0.tar.gz
VIRTUALENV_SRC_SHA256SUM := 1d7e241b431e7afce47e77f8843a276f652699d1fa4f93b9d8ce0076fd7b0b54

KUBECTL_VERSION := 1.10.1
KUBECTL_SRC_SHA256SUM := 1bb4d3793fb0f9e1cfee86599e0f43ae5f15578a01b61011fe7c9488e114a00b

HELM_VERSION := 2.8.2
HELM_SRC_SHA256SUM := 614b5ac79de4336b37c9b26d528c6f2b94ee6ccacb94b0f4b8d9583a8dd122d3
HELM_BIN_SHA256SUM := 0521956fa22be33189cc825bb27b3f4178c5ce9a448368b5c81508d446472715

UNAME_KERNEL = $(shell uname -s | tr '[:upper:]' '[:lower:]')
UNAME_MACHINE = $(shell uname -m | sed 's/^x86_64$$/amd64/')

KUBECTL_SRC := https://storage.googleapis.com/kubernetes-release/release/v$(KUBECTL_VERSION)/bin/$(UNAME_KERNEL)/$(UNAME_MACHINE)/kubectl
HELM_SRC := https://storage.googleapis.com/kubernetes-helm/helm-v$(HELM_VERSION)-$(UNAME_KERNEL)-$(UNAME_MACHINE).tar.gz

PYTHON := python

SHELL_ENV := .shell-env

SHELL_ENV_EXISTS = $(SHELL_ENV)/.exists
$(SHELL_ENV_EXISTS):
	@mkdir -p $(shell dirname $@)
	@touch $@

PYTHON_VIRTUALENV_SRC = $(SHELL_ENV)/$(shell basename $(VIRTUALENV_SRC))
$(PYTHON_VIRTUALENV_SRC): $(SHELL_ENV_EXISTS)
	@rm -f $@.tmp
	@$(PYTHON) hack/download.py $(VIRTUALENV_SRC) $@.tmp
	@echo $(VIRTUALENV_SRC_SHA256SUM)  $@.tmp | sha256sum -c > /dev/null
	@mv $@.tmp $@

PYTHON_VIRTUALENV = $(SHELL_ENV)/$(shell basename $(PYTHON_VIRTUALENV_SRC) .tar.gz)
PYTHON_VIRTUALENV_EXISTS = $(PYTHON_VIRTUALENV)/.exists
$(PYTHON_VIRTUALENV_EXISTS): $(SHELL_ENV_EXISTS) $(PYTHON_VIRTUALENV_SRC)
	@rm -rf $(PYTHON_VIRTUALENV)
	@tar -xf $(PYTHON_VIRTUALENV_SRC) -C $(shell dirname $(PYTHON_VIRTUALENV))
	@touch $@

VENV = $(SHELL_ENV)/metal-k8s
VENV_BIN = $(VENV)/bin
VENV_ACTIVATE = $(VENV_BIN)/activate

VENV_EXISTS = $(VENV)/.exists
$(VENV_EXISTS): $(PYTHON_VIRTUALENV_EXISTS)
	@rm -rf $(VENV)
	@echo "Creating virtualenv..."
	@PYTHONPATH=$(PYTHON_VIRTUALENV) $(PYTHON) -m virtualenv $(VENV) > /dev/null
	@touch $@

REQUIREMENTS_INSTALLED = $(SHELL_ENV)/.requirements_installed
$(REQUIREMENTS_INSTALLED): $(VENV_EXISTS) requirements.txt
	@echo "Installing Python dependencies..."
	@. $(VENV_ACTIVATE) && pip install -r requirements.txt > /dev/null
	@touch $@

KUBECTL_BIN = $(SHELL_ENV)/kubectl-$(KUBECTL_VERSION)
$(KUBECTL_BIN): $(SHELL_ENV_EXISTS)
	@rm -f $@.tmp
	@echo "Downloading kubectl..."
	@$(PYTHON) hack/download.py $(KUBECTL_SRC) $@.tmp
	@echo $(KUBECTL_SRC_SHA256SUM)  $@.tmp | sha256sum -c > /dev/null
	@chmod a+x $@.tmp
	@mv $@.tmp $@

KUBECTL = $(VENV_BIN)/kubectl
$(KUBECTL): $(KUBECTL_BIN) $(VENV_EXISTS)
	@ln -sf $(shell realpath $(KUBECTL_BIN)) $@

HELM_SRC_TAR = $(SHELL_ENV)/$(shell basename $HELM_SRC)
$(HELM_SRC_TAR): $(SHELL_ENV_EXISTS)
	@rm -f $@.tmp
	@echo "Downloading Helm..."
	@$(PYTHON) hack/download.py $(HELM_SRC) $@.tmp
	@echo $(HELM_SRC_SHA256SUM)  $@.tmp | sha256sum -c > /dev/null
	@mv $@.tmp $@

HELM_BIN = $(SHELL_ENV)/helm-$(HELM_VERSION)
$(HELM_BIN): $(HELM_SRC_TAR) $(SHELL_ENV_EXISTS)
	@rm -f $(SHELL_ENV)/$(UNAME_KERNEL)-$(UNAME_MACHINE)/helm
	@tar -xf $(HELM_SRC_TAR) -C $(SHELL_ENV) $(UNAME_KERNEL)-$(UNAME_MACHINE)/helm
	@echo $(HELM_BIN_SHA256SUM)  $(SHELL_ENV)/$(UNAME_KERNEL)-$(UNAME_MACHINE)/helm | sha256sum -c > /dev/null
	@mv $(SHELL_ENV)/$(UNAME_KERNEL)-$(UNAME_MACHINE)/helm $@

HELM = $(VENV_BIN)/helm
$(HELM): $(HELM_BIN) $(VENV_EXISTS)
	@ln -sf $(shell realpath $(HELM_BIN)) $@

BASHRC = $(SHELL_ENV)/bashrc
$(BASHRC): $(SHELL_ENV_EXISTS) hack/shell-bashrc
	@rm -f $@
	@sed s:@VENV_ACTIVATE@:$(VENV_ACTIVATE):g < hack/shell-bashrc > $@ || (rm -f $@; exit 1)

shell: $(VENV_EXISTS) $(REQUIREMENTS_INSTALLED) $(KUBECTL) $(HELM) $(BASHRC)
	@echo "Launching metal-k8s shell environment. Run 'exit' to quit."
	@bash --rcfile $(BASHRC) ||:
.PHONY: shell

clean-shell:
	@rm -rf $(SHELL_ENV)
.PHONY: clean-shell
