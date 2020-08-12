.POSIX:

.DEFAULT_GOAL := all
all: images ui operator manifest
.PHONY: all

# Use this empty target to force execution of a rule
FORCE:

include VERSION
VERSION_FULL = \
	$(VERSION_MAJOR).$(VERSION_MINOR).$(VERSION_PATCH)$(VERSION_SUFFIX)

PWD := $(shell pwd)
GIT_REVISION := $(shell git describe --long --always --tags --dirty)
BUILD_TIMESTAMP := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_HOST := $(shell hostname)

ifeq '$(VERSION_SUFFIX)' 'dev'
DEVELOPMENT_RELEASE = 1
else
DEVELOPMENT_RELEASE = 0
endif

PRODUCT_NAME ?= Example Solution
PRODUCT_LOWERNAME ?= example-solution


# Destination paths
BUILD_ROOT ?= $(PWD)/_build
ISO_ROOT ?= $(BUILD_ROOT)/root
IMAGES_ROOT = $(ISO_ROOT)/images
ISO ?= $(BUILD_ROOT)/$(PRODUCT_LOWERNAME)-$(VERSION_FULL).iso

# Source paths
IMAGES_SRC ?= $(PWD)/images
UI_SRC ?= $(PWD)/ui
OPERATOR_SRC ?= $(PWD)/operator

# Binary paths and options
DOCKER ?= docker
DOCKER_OPTS ?=
DOCKER_SOCKET ?= unix:///var/run/docker.sock
HARDLINK ?= hardlink
OPERATOR_SDK ?= operator-sdk
OPERATOR_SDK_OPTS ?=
SKOPEO ?= skopeo
SKOPEO_OPTS ?= --override-os linux --insecure-policy
REGISTRY_SCRIPT ?= \
	$(PWD)/static-container-registry/static-container-registry.py


# Container images {{{

BUILD_ARGS ?= \
	--build-arg VERSION=$(VERSION_FULL) \
	--build-arg BUILD_DATE=$(BUILD_TIMESTAMP) \
	--build-arg VCS_REF=$(GIT_REVISION) \
	--build-arg PROJECT_VERSION=$(VERSION_FULL)

# Images are either defined under `images/<name>/`, or in the UI and Operator
# sources.
# UI and Operator images deserve special treatment and are thus handled
# separately.
STD_IMAGES := $(notdir $(wildcard $(IMAGES_SRC)/*))

# Image targets and their order of execution is controlled using indicator
# files stored in `_build/images/<image_name>/`.
# A `.built` file is touched on time of build, and `.saved` on time of save.
_built_tgt = $(BUILD_ROOT)/images/$(1)/.built
_saved_tgt = $(BUILD_ROOT)/images/$(1)/.saved

images: build_images save_images dedup_images gen_registry_config
.PHONY: images

# Build container images
build_images: build_ui build_operator build_std_images
.PHONY: build_images

# Build UI image
UI_IMG_NAME ?= $(PRODUCT_LOWERNAME)-ui
UI_BUILD_TARGET = $(call _built_tgt,$(UI_IMG_NAME))
build_ui: $(UI_BUILD_TARGET)
.PHONY: build_ui

UI_IMG_DEPS := $(shell find $(UI_SRC) \
	-path "$(UI_SRC)/deploy" -prune -or \
	-path "$(UI_SRC)/node_modules" -prune -or \
	-type f \
	-not -name ".*" -and \
	-not -name "Dockerfile" -and \
	-not -name "README.md" \
	-print \
)
$(UI_BUILD_TARGET): $(UI_SRC)/Dockerfile $(UI_IMG_DEPS)
	@echo Building UI image "$(UI_IMG_NAME):$(VERSION_FULL)"...
	@mkdir -p $(@D)
	docker build -t $(UI_IMG_NAME):$(VERSION_FULL) $(BUILD_ARGS) $(<D)
	@touch $@
	@echo Built UI image.

# Build Operator image
OPERATOR_IMG_NAME ?= $(PRODUCT_LOWERNAME)-operator
OPERATOR_BUILD_TARGET = $(call _built_tgt,$(OPERATOR_IMG_NAME))
build_operator: $(OPERATOR_BUILD_TARGET)
.PHONY: build_operator

OPERATOR_IMG_DEPS := $(shell find $(OPERATOR_SRC) \
	-path "$(OPERATOR_SRC)/deploy" -prune -or \
	-path "$(OPERATOR_SRC)/build/_output" -prune -or \
	-type f -not -name ".*" -print \
)
OPERATOR_BUILD_ARGS ?= \
	--go-build-args "-ldflags -X=operator/version.Version=$(VERSION_FULL)"

$(OPERATOR_BUILD_TARGET): $(OPERATOR_IMG_DEPS)
	@echo Building Operator image "$(OPERATOR_IMG_NAME):$(VERSION_FULL)"...
	@mkdir -p $(@D)
	cd $(OPERATOR_SRC) && \
		$(OPERATOR_SDK) $(OPERATOR_SDK_OPTS) build $(OPERATOR_BUILD_ARGS) \
		$(OPERATOR_IMG_NAME):$(VERSION_FULL)
	@touch $@
	@echo Built Operator image.

# Build other images
STD_BUILD_TARGETS = $(foreach img,$(STD_IMAGES),$(call _built_tgt,$(img)))
build_std_images: $(STD_BUILD_TARGETS)
.PHONY: build_std_images

$(BUILD_ROOT)/images/%/.built: $(IMAGES_SRC)/%/*
	@echo Building component image "$*:$(VERSION_FULL)"
	@echo All preprequisites for this component: $^
	@mkdir -p $(@D)
	$(DOCKER) $(DOCKER_OPTS) build -t $*:$(VERSION_FULL) $(BUILD_ARGS) $(<D)
	@touch $@
	@echo Built all component images.


# Save images as layers with skopeo
ALL_IMG_NAMES = $(STD_IMAGES) $(OPERATOR_IMG_NAME) $(UI_IMG_NAME)
IMG_SAVE_TARGETS = $(foreach img,$(ALL_IMG_NAMES),$(call _saved_tgt,$(img)))

save_images: $(IMG_SAVE_TARGETS) | build_images
.PHONY: save_images

$(IMAGES_ROOT)/%:
	mkdir -p $@

$(BUILD_ROOT)/images/%/.saved: $(BUILD_ROOT)/images/%/.built | $(IMAGES_ROOT)/%
	@echo Saving image "$*:$(VERSION_FULL)"...
	@mkdir -p $(@D)
	$(SKOPEO) $(SKOPEO_OPTS) copy \
		--format v2s2 --dest-compress \
		--src-daemon-host $(DOCKER_SOCKET) \
		docker-daemon:$*:$(VERSION_FULL) \
		dir:$(IMAGES_ROOT)/$*/$(VERSION_FULL)
	@touch $@
	@echo Saved all images.

# Deduplicate image layers with hardlink
dedup_images: $(BUILD_ROOT)/images/.deduplicated | save_images
.PHONY: dedup_images

$(BUILD_ROOT)/images/.deduplicated: $(IMG_SAVE_TARGETS)
	@echo Deduplicating image layers...
	$(HARDLINK) -c $(IMAGES_ROOT)
	@touch $@
	@echo Deduplicated image layers.


# Generate image registry config for NGINX with a custom script
gen_registry_config: $(ISO_ROOT)/registry-config.inc.j2 | dedup_images
.PHONY: gen_registry_config

$(ISO_ROOT)/registry-config.inc.j2: $(BUILD_ROOT)/images/.deduplicated
	@echo Generating NGINX registry configuration...
	$(REGISTRY_SCRIPT) \
		--name-prefix '{{ repository }}' \
		--server-root '{{ registry_root }}' \
		--omit-constants \
		$(IMAGES_ROOT) > $@
	@echo Generated NGINX registry configuration.


# }}}
# Files to copy into the build tree {{{

# UI manifests
UI_MANIFESTS := $(wildcard $(UI_SRC)/deploy/*.yaml)
UI_TARGETS := $(subst $(UI_SRC)/deploy,$(ISO_ROOT)/ui,$(UI_MANIFESTS))

ui: $(UI_TARGETS)
.PHONY: ui

$(ISO_ROOT)/ui/%.yaml: $(UI_SRC)/deploy/%.yaml $(PWD)/VERSION
	@echo Render $< into $@.
	@mkdir -p $(@D)
	@sed \
		-e 's/@VERSION@/$(VERSION_FULL)/' \
		-e 's/@REPOSITORY@/{{ repository }}/' \
		$< > $@

# Operator manifests
OPERATOR_MANIFESTS := $(wildcard \
	$(OPERATOR_SRC)/deploy/*.yaml \
	$(OPERATOR_SRC)/deploy/crds/*.yaml \
)
OPERATOR_TARGETS := \
	$(subst $(OPERATOR_SRC),$(ISO_ROOT)/operator,$(OPERATOR_MANIFESTS))

operator: $(OPERATOR_TARGETS)
.PHONY: operator

$(ISO_ROOT)/operator/%: $(OPERATOR_SRC)/%
	@echo Copy "$<" to "$@".
	@mkdir -p $(@D)
	@rm -f $@
	@cp -a $< $@

# Solution manifest
manifest: $(ISO_ROOT)/manifest.yaml
.PHONY: manifest

$(ISO_ROOT)/manifest.yaml: $(PWD)/manifest.py $(PWD)/VERSION FORCE
	@echo Write Solution info to "manifest.yaml".
	@rm -f $@
	@mkdir -p $(@D)
	$< --name "$(PRODUCT_LOWERNAME)" \
	   --annotation "solutions.metalk8s.scality.com/build-timestamp" "$(BUILD_TIMESTAMP)" \
	   --annotation "solutions.metalk8s.scality.com/build-host" "$(BUILD_HOST)" \
	   --annotation "solutions.metalk8s.scality.com/development-release" "$(DEVELOPMENT_RELEASE)" \
	   --annotation "solutions.metalk8s.scality.com/display-name" "$(PRODUCT_NAME)" \
	   --annotation "solutions.metalk8s.scality.com/git-revision" "$(GIT_REVISION)" \
	   --extra-image "base-server" "$(VERSION_FULL)" \
	   --extra-image "$(UI_IMG_NAME)" "$(VERSION_FULL)" \
	   --operator-image "$(OPERATOR_IMG_NAME)" "$(VERSION_FULL)" \
	   --version "$(VERSION_FULL)" \
	   > $@ || (rm -f $@; false)


# }}}
# Generate ISO archive {{{

iso: $(ISO)
.PHONY: iso

# Since manifest.yaml is generated every time, we don't need explicit
# requisites for this ISO generation - it will happen every time.
# We leave the `all` target handle generation of the ISO contents.
$(ISO): all
	mkisofs -output $@ \
		-quiet \
		-rock \
		-joliet \
		-joliet-long \
		-full-iso9660-filenames \
		-volid "$(PRODUCT_NAME) $(VERSION_FULL)" \
		--iso-level 3 \
		-gid 0 \
		-uid 0 \
		-input-charset iso8859-1 \
		-output-charset iso8859-1 \
		$(ISO_ROOT)
	cd $$(dirname $@) && sha256sum $(notdir $@) > SHA256SUM


# }}}
