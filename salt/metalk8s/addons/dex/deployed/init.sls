#
# States to deploy Dex
#
# Available states
# ================
#
# * namespace              -> creates a namespace metalk8s-auth
# * tls-secret             -> store Dex server cert and key in a Secret
# * chart                  -> charts used to deploy Dex
# * clusterrolebinding     -> binds dex static user to cluster admin

include:
- .namespace
- .tls-secret
- .nginx-ingress-ca-cert-configmap
- .theme-configmap
- .service-configuration
- .secret
- .chart
- .clusterrolebinding
- .servicemonitor
