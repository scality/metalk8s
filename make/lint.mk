# Lint targets for MetalK8S environment
# Requirements for linting on host:
#    - python3
#    - tox

lint:
	tox -e lint-yaml
	tox -e lint-shell

.PHONY: lint
