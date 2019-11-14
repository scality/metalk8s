#
# State to manage dex certs
#
# Available states
# ================
#
# * dex-rootca           -> generate dex root ca and key
# * dex-server           -> generate dex server certificate and key
#

include:
  - .dex-rootca
  - .dex-server