#
# Requirements states
#
# 1 directory per requirement.
# Each requirement should contain (at least):
# ===========================================
#
# * installed   -> install the requirement
# * absent      -> remove all the requirement installed by `installed` state
#
include:
  - .m2crypto
  - .preflight
