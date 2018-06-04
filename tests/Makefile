
DEBUG = 1
V = @

-include config.mk

TESTS_FILE = $(wildcard test-*.sh)
TESTS = $(foreach test,$(TESTS_FILE),$(firstword $(subst ., ,$(test))))

test: $(TESTS)


$(TESTS):
	sh $@.sh

# :vim set noexpandtab shiftwidth=8 softtabstop=0
