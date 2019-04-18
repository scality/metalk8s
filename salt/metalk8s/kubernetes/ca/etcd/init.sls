#
# State to manage etcd CA server
#
# Available states
# ================
#
# * installed   -> install and advertise as CA server
# * advertised  -> deploy the etcd CA certificate
#
include:
  - .installed
