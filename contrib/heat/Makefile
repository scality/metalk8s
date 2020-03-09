.POSIX:

.DEFAULT_GOAL := oneclick

RELEASED_VERSION := $(shell git describe --abbrev=0)
GIT_REVISION := $(shell git describe --long --tags --always --dirty)

oneclick: metalk8s-oneclick-v$(RELEASED_VERSION).zip
.PHONY: oneclick

clean:
	@rm -rf _build
.PHONY: clean



ROOT_FILES := manifest.yaml template.yaml logo.png
ROOT_TARGETS = $(foreach file,$(ROOT_FILES),_build/$(file))

_build/template.yaml _build/logo.png &: template.yaml logo.png
	mkdir -p $(@D)
	cp -t $(@D) $^

_build/manifest.yaml: manifest.yaml.in
	mkdir -p $(@D)
	rm -f $@
	sed 's/@@VERSION/$(RELEASED_VERSION)/; s/@@REVISION/$(GIT_REVISION)/' $< > $@


SCRIPT_FILES := $(shell find scripts/ -type f -print)
TEMPLATE_FILES := $(shell find templates/ -type f -print)
EXTRA_FILES := node.template

ALL_HOT_FILES = $(SCRIPT_FILES) $(TEMPLATE_FILES) $(EXTRA_FILES)
ALL_HOT_TARGETS = $(foreach file,$(ALL_HOT_FILES),_build/Resources/HotFiles/$(file))

$(ALL_HOT_TARGETS) &: $(ALL_HOT_FILES)
	mkdir -p $(@D)
	cp -t $(@D) $^


metalk8s-oneclick-v$(RELEASED_VERSION).zip: $(ROOT_TARGETS) $(ALL_HOT_TARGETS)
	@echo Creating OneClick archive for MetalK8s $(RELEASED_VERSION)
	rm -f $@
	cd _build; zip -r $@ $(foreach tgt,$^,$(tgt:_build/%=%)); cd ..
	mv _build/$@ .
