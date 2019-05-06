SOURCES := $(wildcard *.uml)

default: all
.PHONY: default

all: all-png all-svg
.PHONY: all

all-png: $(patsubst %.uml,%.png,$(SOURCES))
.PHONY: all-png

all-svg: $(patsubst %.uml,%.svg,$(SOURCES))
.PHONY: all-svg

%.png: %.uml
	@echo Rendering $< into $@
	@plantuml -p -tpng > $@ < $<

%.svg: %.uml
	@echo Rendering $< into $@
	@plantuml -p -tsvg > $@ < $<
