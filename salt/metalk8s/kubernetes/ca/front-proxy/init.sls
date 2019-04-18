#
# State to manage front-proxy CA server
#
# Available states
# ================
#
# * installed   -> install and advertise as CA server
# * advertised  -> deploy the front-proxy CA certificate
#
include:
  - .installed
