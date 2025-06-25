#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

# TODO (17/06/2025): change IP Block with variable
# TODO (17/06/2025): change IPSec key with variable

# LB-IPAM configuration
---
apiVersion: "cilium.io/v2alpha1"
kind: CiliumLoadBalancerIPPool
metadata:
  name: "pool"
spec:
  blocks:
    - start: "172.31.25.100"
      stop: "172.31.25.110"

# L2 Announcements configuration
---
apiVersion: "cilium.io/v2alpha1"
kind: CiliumL2AnnouncementPolicy
metadata:
  name: default
spec:
  externalIPs: true
  loadBalancerIPs: true

# IPSec key generation
---
apiVersion: v1
kind: Secret
metadata:
  name: cilium-ipsec-keys
  namespace: kube-system
type: Opaque
data:
  keys: MysgcmZjNDEwNihnY20oYWVzKSkgYzdkNDY5MWU0ZjUwM2YyMDcxNDQ4YjYzOWZkZjE4ZmEzMmVlYjI3MSAxMjg=
