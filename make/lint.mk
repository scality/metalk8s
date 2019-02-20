# Lint targets for MetalK8S environment
# Requirements for linting on host:
#    - python3
#    - tox

lint:
	tox -e lint-salt

.PHONY: lint-local
