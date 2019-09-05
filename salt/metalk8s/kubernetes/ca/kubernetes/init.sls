#
# State to manage kubernetes CA server
#
# Available states
# ================
#
# * installed   -> install as CA server
# * exported    -> export the CA certificate in the mine
# * advertised  -> deploy the kubernetes CA certificate
#
include:
  - .exported
