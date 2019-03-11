REPOSITORIES := \
  scality \
  base \
  extras \
  updates \
  external \
  epel \
  saltstack \
  kubernetes \

$(foreach repo,$(REPOSITORIES),$(eval $(call create-repo,$(repo))))