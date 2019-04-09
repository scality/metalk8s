#
# State to manage kubernetes CA server
#
# Available states
# ================
#
# * installed   -> install and advertise as CA server
# * advertised  -> deploy the kubernetes CA certificate
#
include:
  - .installed
