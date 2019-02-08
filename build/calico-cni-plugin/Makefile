USER := $$(whoami)
UID := $$(id -u)
GUID := $$(id -g)
BUILDER_NAME := pkg-builder

gettag = $(shell docker run --rm \
                 -v `pwd`:/app/ pkg-builder \
                 rpm -q --queryformat "$(1)" \
                 --specfile /app/calico-cni-plugin.spec)

VARS := $(call gettag,%{Version}/%{Release}/%{Arch},)
VERSION := $(shell echo $(VARS) | cut -d'/' -f 1)
RELEASE := $(shell echo $(VARS) | cut -d'/' -f 2)
ARCH := $(shell echo $(VARS) | cut -d'/' -f 3)


calico-cni-plugin-$(VERSION)-$(RELEASE).$(ARCH).rpm: container-centos7.stab calico-cni-plugin-$(VERSION)-$(RELEASE).src.rpm
	docker exec -it \
	   $(BUILDER_NAME) \
       bash -c "\
       rpmdev-setuptree /root/ \
       && mkdir -p /root/rpmbuild/SRPM/ \
       && cp /buildlab/$(USER)/calico-cni-plugin-$(VERSION)-$(RELEASE).src.rpm /root/rpmbuild/SRPM/ \
       && rpmbuild --rebuild /buildlab/$(USER)/calico-cni-plugin-$(VERSION)-$(RELEASE).src.rpm \
       && cp /root/rpmbuild/RPMS/$(ARCH)/calico-cni-plugin-$(VERSION)-$(RELEASE).$(ARCH).rpm /buildlab/$(USER) \
       && chown $(UID):$(GUID) /buildlab/$(USER)/calico-cni-plugin-$(VERSION)-$(RELEASE).$(ARCH).rpm \
       && rm -r /root/rpmbuild \
       "


calico-cni-plugin-$(VERSION)-$(RELEASE).src.rpm: container-centos7.stab calico-cni-plugin.spec
	docker exec -it \
	   $(BUILDER_NAME) \
       bash -c "\
	   rpmdev-setuptree /root/ \
       && cp /buildlab/$(USER)/calico-cni-plugin.spec /root/ \
       && spectool -g -R /root/calico-cni-plugin.spec \
       && rpmbuild -ba /root/calico-cni-plugin.spec \
       && cp /root/rpmbuild/SRPMS/calico-cni-plugin-$(VERSION)-$(RELEASE).src.rpm /buildlab/$(USER) \
       && chown $(UID):$(GUID) /buildlab/$(USER)/calico-cni-plugin-$(VERSION)-$(RELEASE).src.rpm -R \
       && rm -r /root/rpmbuild"


.PHONY: container-centos7
container-centos7:
	touch -m container-centos7.stab

container-centos7.stab: pkg-builder-image-centos7.stab
	docker run -t \
	-d \
	--name $(BUILDER_NAME) \
	-v $$(pwd):/buildlab/$(USER) \
	$(BUILDER_NAME)
	touch -m container-centos7.stab


.PHONY: image-centos7
image-centos7:
	touch -m pkg-builder-image-centos7.stab

pkg-builder-image-centos7.stab:
	docker build -t $(BUILDER_NAME) \
	.
	touch -m pkg-builder-image-centos7.stab


.PHONY: clean
clean:
	rm -f *.stab
	docker kill $(BUILDER_NAME) 2> /dev/null || true
	docker rm $(BUILDER_NAME) 2> /dev/null || true