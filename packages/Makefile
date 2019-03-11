.DEFAULT_GOAL := all
SHELL ?= /bin/bash

# Get the parent directory of this Makefile
# WARNING: `lastword` will not work if there are spaces in this Makefile path
BASE_DIR := $(abspath $(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# Set the build and ISO root if this Makefile was invoked directly
BUILD_ROOT ?= $(abspath $(BASE_DIR)/../_build)
ISO_ROOT ?= $(BUILD_ROOT)/root

#
# Docker builder
#

BUILDER_IMAGE ?= metalk8s-build:latest
BUILDER_CONTAINER := $(BUILD_ROOT)/package-build-container

# This target is a simple empty file used to track whether the docker image is
# up-to-date, and can be used as an order-only prerequisite
$(BUILDER_CONTAINER): Dockerfile entrypoint.sh
	mkdir -p $(@D)
	rm -f $@
	docker build -t $(BUILDER_IMAGE) -f $< $(dir $<)
	touch $@

DOCKER ?= docker

TARGET_UID := $(shell id -u)
TARGET_GID := $(shell id -g)

#
# Packages
#

PACKAGES_ROOT := $(BUILD_ROOT)/packages
$(PACKAGES_ROOT):
	mkdir -p $@

# Sub-directories to create for each package
PACKAGE_SUBDIRS := SOURCES SRPMS RPMS SPECS

# Templated rules for building a RPM from sources (see packages/packages.mk for
# an example usage)
define create-pkg-from-source =
  ifeq ($($(1)-name),)
    $$(error Must define a name for each package built from source (define the variable `$(1)-name`))
  else
    __name := $($(1)-name)
  endif

  ifeq ($($(1)-version),)
    $$(error Must define a version for each package built from source (define the variable `$(1)-version`))
  else
    __version := $($(1)-version)
  endif

  ifdef $(1)-build
    __build := $($(1)-build)
  else
    $$(warning Setting build ID for $$(__name) to 1 since not provided)
    __build := 1
  endif

  __pkg_dir := $(PACKAGES_ROOT)/$$(__name)
  $$(__pkg_dir): | $(PACKAGES_ROOT)
	mkdir -p $$@

  $(foreach subdir,$(PACKAGE_SUBDIRS),$$(__pkg_dir)/$(subdir)): | $$(__pkg_dir)
	mkdir -p $$@

  __pkg_fullname := $$(__name)-$$(__version)-$$(__build)

  # Build detailed specfile
  $$(__pkg_dir)/SPECS/$$(__name).meta: specs/$$(__name).spec | $$(__pkg_dir)/SPECS $(BUILDER_CONTAINER)
	rm -f $$@
	$(DOCKER) run \
		--hostname build \
		--mount type=bind,source=$(BASE_DIR)/$$<,destination=/rpmbuild/SPECS/$$(<F),ro \
		--read-only \
		--rm \
		$(BUILDER_IMAGE) \
		su -l build -c "rpmspec -P /rpmbuild/SPECS/$$(<F)" > $$@ || (rm -f $$@; false)

  # Fetch declared sources
  __sources := $($(1)-sources)
  __source_files := $$(addprefix $$(__pkg_dir)/SOURCES/,$$(__sources))

  $$(__source_files): $$(__pkg_dir)/SPECS/$$(__name).meta | $$(__pkg_dir)/SOURCES
	curl -L -o "$$@" "$$(shell awk '/^Source[0-9]+:.*\/$$(@F)$$$$/ { print $$$$2 }' < $$<)"

  # Build SRPM
  __suffix := $$(or $($(1)-suffix),.el7)

  $$(__pkg_dir)/SRPMS/$$(__pkg_fullname)$$(__suffix).src.rpm: specs/$$(__name).spec $$(__source_files) | $$(__pkg_dir)/SRPMS $(BUILDER_CONTAINER)
	$(DOCKER) run \
		--env SPEC=$$(<F) \
		--env SRPM=$$(@F) \
		--env SOURCES="$$(notdir $$(wordlist 2,$$(words $$^),$$^))" \
		--env TARGET_UID=$(TARGET_UID) \
		--env TARGET_GID=$(TARGET_GID) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(BASE_DIR)/$$<,destination=/rpmbuild/SPECS/$$(<F),ro \
		--mount type=bind,source=$$(dir $$(word 2,$$^)),destination=/rpmbuild/SOURCES,ro \
		--mount type=bind,source=$$(@D),destination=/rpmbuild/SRPMS \
		--mount type=bind,source=$(BASE_DIR)/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--mount type=bind,source=$(BASE_DIR)/entrypoint.sh,destination=/entrypoint.sh,ro \
		--read-only \
		--rm \
		$(BUILDER_IMAGE) \
		/entrypoint.sh buildsrpm

  # Build RPM
  ifneq ($($(1)-arch),)
    __arch := $($(1)-arch)
  else
    __arch := noarch
  endif

  $$(__pkg_dir)/RPMS/$$(__arch): | $$(__pkg_dir)/RPMS
	mkdir -p $$@

  $$(__pkg_dir)/RPMS/$$(__arch)/$$(__pkg_fullname)$$(__suffix).$$(__arch).rpm: $$(__pkg_dir)/SRPMS/$$(__pkg_fullname)$$(__suffix).src.rpm | $$(__pkg_dir)/RPMS/$$(__arch) $(BUILDER_CONTAINER)
	DEST_FILE=$$@ && $(DOCKER) run \
		--env RPMS="$$$${DEST_FILE#*RPMS/}" \
		--env SRPM=$$(<F) \
		--env TARGET_UID=$(TARGET_UID) \
		--env TARGET_GID=$(TARGET_GID) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$$<,destination=/rpmbuild/SRPMS/$$(<F),ro \
		--mount type=bind,source=$$(@D),destination=/rpmbuild/RPMS \
		--mount type=bind,source=$(BASE_DIR)/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--mount type=bind,source=$(BASE_DIR)/entrypoint.sh,destination=/entrypoint.sh,ro \
		--rm \
		$(BUILDER_IMAGE) \
		/entrypoint.sh buildrpm

  # Add the built RPM to the list for the appropriate repository
  __reponame := $$(or $($(1)-reponame),scality)
  $$(__reponame)-rpmlist := $$($$(__reponame)-rpmlist) $$(__pkg_dir)/RPMS/$$(__arch)/$$(__pkg_fullname)$$(__suffix).$$(__arch).rpm
endef

#
# Repositories
#

BASE_REPO_ROOT := $(ISO_ROOT)/packages
$(BASE_REPO_ROOT): # Commented for now, question: how to handle optionally defined req..? # | $(ISO_ROOT)
	mkdir -p $@

REPO_PREFIX := metalk8s
REPO_SUFFIX := el7

ALL_REPOS :=

# Helper rule template for copying RPMs to the correct repository
define copy-rpm =
  # NOTE: this might not be a pure basename, e.g. "x86_64/calico-..."
  __basename := $$(shell _PATH=$(1) && echo $$$${_PATH\#*RPMS/})
  __dest := $$(addprefix $(2)/,$$(__basename))

  $$(__dest): $(1) | $(2)
	echo $$@
	mkdir -p $$(@D)  # This is needed in case `__basename` includes a directory
	cp $$< $$@

  __repo_rpmlist += $$(__dest)
endef

# Create rules for building a repository from accurately named variables,
# e.g. $(create-repo scality)
define create-repo =
  __repo_root := $(BASE_REPO_ROOT)/$(REPO_PREFIX)-$(1)-$(REPO_SUFFIX)
  $$(__repo_root): | $(BASE_REPO_ROOT)
	mkdir -p $$@

  __repo_repodata := $$(__repo_root)/repodata/repomd.xml

  # List of built RPMs (may be empty)
  __rpmlist := $($(1)-rpmlist)

  # List of targets for RPMs saved in the repo
  __repo_rpmlist := # Will be extended by the `copy-rpm` calls
  $$(eval $$(foreach rpm_path,$$(__rpmlist),$$(call copy-rpm,$$(rpm_path),$$(__repo_root))))

  $$(__repo_repodata): $$(__repo_rpmlist) | $$(__repo_root) $(BUILDER_CONTAINER)
	mkdir -p $$(@D)
	$(DOCKER) run \
		--env TARGET_UID=$(TARGET_UID) \
		--env TARGET_GID=$(TARGET_GID) \
		--hostname build \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$$(firstword $$|),destination=/repository,ro \
		--mount type=bind,source=$$(@D),destination=/repository/repodata \
		--mount type=bind,source=$(BASE_DIR)/entrypoint.sh,destination=/entrypoint.sh,ro \
		--read-only \
		--rm \
		$(BUILDER_IMAGE) \
		/entrypoint.sh buildrepo

  # We add final targets to the ALL_REPOS variable
  ALL_REPOS += $$(__repo_repodata)
endef


#
# Targets
#

# These two files declare packages and repositories to build, using the few
# functions defined above
include packages.mk
include repositories.mk


# NOTE: YUM_PACKAGES_CACHE is defined in packages.mk
#       ALL_REPOS is constructed by calling create-repo, in repositories.mk
all: $(YUM_PACKAGES_CACHE) $(ALL_REPOS) ## Make all repositories
.PHONY: all


help: ## Show this help message
	@echo "The following targets are available:"
	@echo
	@grep -Eh '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help

