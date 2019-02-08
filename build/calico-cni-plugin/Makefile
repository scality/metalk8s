default: all
.PHONY: default

DOCKER_IMAGE ?= metalk8s-build
DOCKER_CONTAINER := .docker-container

RPMS = calico-cni-plugin-3.4.0-1.el7.x86_64.rpm

CALICO_CNI_PLUGIN_SOURCES = \
	v3.4.0.tar.gz \
	calico-amd64 \
	calico-ipam-amd64 \

all: $(RPMS)
.PHONY: all

clean:
	rm -f *.rpm
	rm -f $(CALICO_CNI_PLUGIN_SOURCES)
	rm -f *.meta
	rm -f $(DOCKER_CONTAINER)
.PHONY: clean

$(DOCKER_CONTAINER): Dockerfile entrypoint.sh
	rm -f $@
	docker build -t $(DOCKER_IMAGE) .
	touch $@

%.meta: %.spec | $(DOCKER_CONTAINER)
	rm -f $@
	docker run \
		--hostname build \
		--mount type=bind,source=$(PWD)/$<,destination=/rpmbuild/SPECS/$<,ro \
		--read-only \
		--rm \
		$(DOCKER_IMAGE) \
		su -l build -c "rpmspec -P /rpmbuild/SPECS/$<" > $@ || (rm -f $@; false)

$(CALICO_CNI_PLUGIN_SOURCES): calico-cni-plugin.meta
	curl -L -o "$@" "$(shell awk '/^Source[0-9]+:.*\/$@$$/ { print $$2 }' < $<)"


calico-cni-plugin-3.4.0-1.el7.src.rpm: calico-cni-plugin.spec $(CALICO_CNI_PLUGIN_SOURCES) | rpmlintrc $(DOCKER_CONTAINER)
	docker run \
		--env SPEC=$< \
		--env SRPM=$@ \
		--env SOURCES="$(CALICO_CNI_PLUGIN_SOURCES)" \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(PWD)/$<,destination=/rpmbuild/SPECS/$<,ro \
		--mount type=bind,source=$(PWD)/v3.4.0.tar.gz,destination=/rpmbuild/SOURCES/v3.4.0.tar.gz,ro \
		--mount type=bind,source=$(PWD)/calico-amd64,destination=/rpmbuild/SOURCES/calico-amd64,ro \
		--mount type=bind,source=$(PWD)/calico-ipam-amd64,destination=/rpmbuild/SOURCES/calico-ipam-amd64,ro \
		--mount type=bind,source=$(PWD),destination=/rpmbuild/SRPMS \
		--mount type=bind,source=$(PWD)/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--read-only \
		--rm \
		$(DOCKER_IMAGE) \
		buildsrpm

calico-cni-plugin-3.4.0-1.el7.x86_64.rpm: calico-cni-plugin-3.4.0-1.el7.src.rpm | rpmlintrc $(DOCKER_CONTAINER)
	# Note: because we use `yum-builddep`, this one can't be `--read-only`
	docker run \
		--env RPMS="x86_64/$@" \
		--env SRPM=$< \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(PWD)/$<,destination=/rpmbuild/SRPMS/$<,ro \
		--mount type=bind,source=$(PWD),destination=/rpmbuild/RPMS \
		--mount type=bind,source=$(PWD)/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--rm \
		$(DOCKER_IMAGE) \
		buildrpm
