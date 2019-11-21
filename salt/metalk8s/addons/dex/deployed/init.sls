#
# States to deploy Dex
#
# Available states
# ================
#
# * namespace              -> creates a namespace metalk8s-auth
# * tls-secret             -> store Dex server cert and key in a Secret
# * chart                  -> charts used to deploy Dex

include:
- .namespace
- .tls-secret
- .chart
