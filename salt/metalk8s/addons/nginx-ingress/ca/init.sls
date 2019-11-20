#
# State to manage self-signed Ingress Certificate Authority
#
# Available states
# ================
#
# * installed   -> install and advertise as Ingress CA
# * advertised  -> deploy the Ingress CA certificate
#

include:
  - .installed
