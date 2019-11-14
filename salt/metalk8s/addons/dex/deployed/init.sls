#
# State to manage dex
#
# Available states
# ================
#
# * namespace              -> creates a namespace metalk8s-auth
# * dex-tls-secret         -> creates dex certificates stored as k8s secret
# * chart                  -> charts used to deploy dex
# * dex-conf               -> contains dex required configurations

include:
- .namespace
- .dex-tls-secret
- .dex-conf
- .dex-service
- .chart
