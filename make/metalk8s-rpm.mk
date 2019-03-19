AWK ?= awk
GIT ?= git
DOCKER ?= docker

$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-$(METALK8S_VERSION).tar.gz: $(shell $(GIT) ls-files)
$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-$(METALK8S_VERSION).tar.gz: .git/$(shell $(AWK) '{ print $$2 }' .git/HEAD)
$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-$(METALK8S_VERSION).tar.gz:
	mkdir -p $(dir $@)
	$(GIT) archive -o $@ --prefix=metalk8s-$(METALK8S_VERSION)/ HEAD


$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz: ui/yarn.lock
$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz: ui/package.json
$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz: | $(PACKAGE_BUILD_CONTAINER)
$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz:
	mkdir -p $(dir $@)
	$(DOCKER) run \
		-t \
		--env NODE_ENV=production \
		--hostname build \
		--mount type=tmpfs,destination=/build \
		--mount type=tmpfs,destination=/tmp \
		$(foreach src,$^,--mount type=bind,source=$(PWD)/$(src),destination=/build/$(notdir $(src)),ro) \
		--mount type=bind,source=$(dir $@),destination=/out \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		sh -xc " \
		    cd /build && \
		    su -l build -c 'cd /build && \
		        yarn install \
			    --production \
			    --pure-lockfile \
			    --frozen-lockfile \
			    --non-interactive \
			    --no-progress \
			    --network-concurrency 1 \
			    --network-timeout 100000' && \
		    chown -R root:root node_modules && \
		    tar czvf /out/$(notdir $@) node_modules/ && \
		    chown $(shell id -u):$(shell id -g) /out/$(notdir $@) && \
		    true \
		" || (rm -f $@; false)


$(BUILD_ROOT)/packages/metalk8s-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.src.rpm: metalk8s.spec
$(BUILD_ROOT)/packages/metalk8s-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.src.rpm: $(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-$(METALK8S_VERSION).tar.gz
$(BUILD_ROOT)/packages/metalk8s-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.src.rpm: $(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz
$(BUILD_ROOT)/packages/metalk8s-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.src.rpm: | $(PACKAGE_BUILD_CONTAINER)
$(BUILD_ROOT)/packages/metalk8s-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.src.rpm:
	mkdir -p $(dir $@)
	$(DOCKER) run \
		-t \
		--env SPEC=$(notdir $<) \
		--env SRPM=$(notdir $@) \
		--env SOURCES="metalk8s-$(METALK8S_VERSION).tar.gz metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz" \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$(PWD)/$<,destination=/rpmbuild/SPECS/$(notdir $<),ro \
		--mount type=bind,source=$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-$(METALK8S_VERSION).tar.gz,destination=/rpmbuild/SOURCES/metalk8s-$(METALK8S_VERSION).tar.gz,ro \
		--mount type=bind,source=$(BUILD_ROOT)/packages/metalk8s/SOURCES/metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz,destination=/rpmbuild/SOURCES/metalk8s-ui-$(METALK8S_VERSION)-node-modules.tar.gz,ro \
		--mount type=bind,source=$(dir $@),destination=/rpmbuild/SRPMS \
		--mount type=bind,source=$(PWD)/packages/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--mount type=bind,source=$(PWD)/packages/entrypoint.sh,destination=/entrypoint.sh,ro \
		--read-only \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		/entrypoint.sh buildsrpm

$(BUILD_ROOT)/packages/metalk8s-ui-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.noarch.rpm: $(BUILD_ROOT)/packages/metalk8s-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.src.rpm
$(BUILD_ROOT)/packages/metalk8s-ui-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.noarch.rpm: | $(PACKAGE_BUILD_CONTAINER)
$(BUILD_ROOT)/packages/metalk8s-ui-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.noarch.rpm:
	mkdir -p $(dir $@)
	# Note: because we use `yum-builddep`, this one can't be `--read-only`
	$(DOCKER) run \
		-t \
		--env RPMS="noarch/$(notdir $@)" \
		--env SRPM=$(notdir $<) \
		--env TARGET_UID=$(shell id -u) \
		--env TARGET_GID=$(shell id -g) \
		--hostname build \
		--mount type=tmpfs,destination=/home/build \
		--mount type=tmpfs,destination=/var/tmp \
		--mount type=tmpfs,destination=/tmp \
		--mount type=bind,source=$<,destination=/rpmbuild/SRPMS/$(notdir $<),ro \
		--mount type=bind,source=$(dir $@),destination=/rpmbuild/RPMS \
		--mount type=bind,source=$(PWD)/packages/rpmlintrc,destination=/rpmbuild/rpmlintrc,ro \
		--mount type=bind,source=$(PWD)/packages/entrypoint.sh,destination=/entrypoint.sh,ro \
		--rm \
		$(PACKAGE_BUILD_IMAGE) \
		/entrypoint.sh buildrpm


$(BUILD_ROOT)/images/metalk8s-ui/metalk8s-ui-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.noarch.rpm: $(BUILD_ROOT)/packages/metalk8s-ui-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.noarch.rpm
	mkdir -p $(dir $@)
	cp $< $@

$(BUILD_ROOT)/images/metalk8s-ui/metalk8s-ui.conf: images/metalk8s-ui/metalk8s-ui.conf
	mkdir -p $(dir $@)
	cp $< $@

$(BUILD_ROOT)/images/metalk8s-ui-container: $(BUILD_ROOT)/images/metalk8s-ui/metalk8s-ui-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.noarch.rpm
$(BUILD_ROOT)/images/metalk8s-ui-container: images/metalk8s-ui/Dockerfile
$(BUILD_ROOT)/images/metalk8s-ui-container: $(BUILD_ROOT)/images/metalk8s-ui/metalk8s-ui.conf
$(BUILD_ROOT)/images/metalk8s-ui-container:
	mkdir -p $(dir $@)
	$(DOCKER) build \
		-t metalk8s-ui:$(METALK8S_UI_CONTAINER_TAG) \
		-f images/metalk8s-ui/Dockerfile \
		--build-arg PACKAGE=metalk8s-ui-$(METALK8S_VERSION)-$(METALK8S_BUILD).el7.noarch.rpm \
		$(BUILD_ROOT)/images/metalk8s-ui
	touch $@
