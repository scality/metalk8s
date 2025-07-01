#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

# TODO (17/06/2025): change API_SERVER_IP with dynamic variable
# Usage: value: '__slot__:salt:metalk8s_network.get_control_plane_ingress_ip()' - NOK
# Usage: Use API server proxy deployed on all nodes => 127.0.0.1
# TODO (17/06/2025): change API_SERVER_PORT with static variable
# Usage: Use API server proxy deployed on all nodes => 7443

# What's below is based on the helm deployment provided by Cilium repository.
# export API_SERVER_IP=127.0.0.1
# export API_SERVER_PORT=7443
# helm template cilium/cilium --version 1.17.4 \
#   --namespace kube-system \
#   --set ipam.mode=kubernetes \
#   --set kubeProxyReplacement=true \
#   --set k8sServiceHost=${API_SERVER_IP} \
#   --set k8sServicePort=${API_SERVER_PORT} \
#   --set rollOutCiliumPods=true \
#   --set envoy.rollOutPods=true \
#   --set envoy.securityContext.capabilities.keepCapNetBindService=true \
#   --set operator.rollOutPods=true \
#   --set operator.replicas=1 \
#   --set operator.skipCRDCreation=true \
#   --set ingressController.enabled=true \
#   --set ingressController.loadbalancerMode=shared \
#   --set l7Proxy=true \
#   --set routingMode="tunnel" \
#   --set tunnelProtocol="geneve" \
#   --set l2announcements.enabled=true \
#   --set l2announcements.leaseDuration=3s \
#   --set l2announcements.leaseRenewDeadline=1s \
#   --set l2announcements.leaseRetryPeriod=500ms \
#   --set enableIPv4Masquerade=true \
#   --set bpf.masquerade=true \
#   --set ipMasqAgent.enabled=true \
#   --set "ipMasqAgent.config.nonMasqueradeCIDRs[0]=10.233.0.0/16" \
#   --set gatewayAPI.enabled=true \
#   --set hubble.enabled=true \
#   --set hubble.relay.enabled=true \
#   --set hubble.relay.rollOutPods=true \
#   --set hubble.ui.enabled=true \
#   --set hubble.ui.rollOutPods=true \
#   --set hubble.ui.ingress.enabled=true \
#   --set hubble.ui.ingress.className=cilium \
#   --set "hubble.ui.ingress.hosts[0]=hubble.localhost" \
#   --set encryption.enabled=true \
#   --set encryption.type=ipsec \
#   --set enableTransparentMode=true \
#   --set prometheus.enabled=true \
#   --set prometheus.serviceMonitor.enabled=true \
#   --set prometheus.serviceMonitor.labels."metalk8s\.scality\.com/monitor"="" \
#   --set "prometheus.serviceMonitor.controllerGroupMetrics[0]=all" \
#   --set hubble.metrics.enabled="{dns:query;ignoreAAAA,drop,tcp,flow,icmp,http}" \
#   --set hubble.metrics.serviceMonitor.enabled=true \
#   --set hubble.metrics.serviceMonitor.labels."metalk8s\.scality\.com/monitor"="" \
#   --set hubble.relay.prometheus.enabled=true \
#   --set hubble.relay.prometheus.serviceMonitor.enabled=true \
#   --set hubble.relay.prometheus.serviceMonitor.labels."metalk8s\.scality\.com/monitor"="" \
#   --set envoy.prometheus.enabled=true \
#   --set envoy.prometheus.serviceMonitor.enabled=true \
#   --set envoy.prometheus.serviceMonitor.labels."metalk8s\.scality\.com/monitor"="" \
#   --set operator.prometheus.enabled=true \
#   --set operator.prometheus.serviceMonitor.enabled=true \
#   --set operator.prometheus.serviceMonitor.labels."metalk8s\.scality\.com/monitor"=""

# Manual modifications
#
# A- Change `nodeSelector` and `Tolerations` to `hubble-ui` and `hubble-relay`
# to allow deployment on bootstrap node
#
# tolerations:
#   - key: "CriticalAddonsOnly"
#     operator: "Exists"
#   - key: "node-role.kubernetes.io/bootstrap"
#     operator: "Exists"
#     effect: "NoSchedule"
#   - key: "node-role.kubernetes.io/infra"
#     operator: "Exists"
#     effect: "NoSchedule"
#
# nodeSelector:
#   kubernetes.io/os: linux
#   node-role.kubernetes.io/infra: ''
#
# B- Delete Endpoint deployment empty labels section
#---
## Source: cilium/templates/cilium-ingress-service.yaml
#apiVersion: v1
#kind: Endpoints
#metadata:
#  name: cilium-ingress
#  namespace: kube-system
# LINE TO DELETE  labels:
#subsets:
#- addresses:
#  - ip: "192.192.192.192"
#  ports:
#  - port: 9999
#
# C- Remove serviceMonitor objects as the CRD is not yet installed
---
# Source: cilium/templates/cilium-secrets-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
---
# Source: cilium/templates/cilium-agent/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-envoy/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "cilium-envoy"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/hubble-relay/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "hubble-relay"
  namespace: kube-system
automountServiceAccountToken: false
---
# Source: cilium/templates/hubble-ui/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "hubble-ui"
  namespace: kube-system
---
# Source: cilium/templates/cilium-ca-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cilium-ca
  namespace: kube-system
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURFekNDQWZ1Z0F3SUJBZ0lRSStsbm9kSS9zSnVwa0JYMW9UZG4vVEFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3TmpJMU1EVXpNekF5V2hjTk1qZ3dOakkwTURVegpNekF5V2pBVU1SSXdFQVlEVlFRREV3bERhV3hwZFcwZ1EwRXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRQ3dLT0tMMTFkR3B0QnVTU0VCQU1uVzM4ckc3VkRYTVl3OFA3ckJNa3lWbGNOT1lQQW8KcytmZnZnMHM2b1Z2cW9NMWNyKzVpNFdDVXlYMmRYZSsxSzlGdC9BQ2Jod1FhSE0vUjdXeSsvN25rdkZsRFFvQgpkT0FMejdOVnA4NWFhcXFaeTBZT1krZWFOZlhUeVMrVHJhK2oxeWwxZGFEOVVWcGp2a281MytTb1k1SVhJUzhMCkwzR2VQTURGTEY3ZHh1Qno5VWRScURYSTJJM1YvTEtuVTF6blMzc0FOMllPWlZQY2g1SnRmNllCYVJ4NHZYUVUKRm1iTXpkRmhMUEdIMU5BNlQrdmpBS1BoaVd4UDhlQ0pESk42RjFUWW82UXQ4VWV5dmpjTHVlVGFldzRZc0ZMYgorYlI2ajI3RVlqYTBtWm9EZmk5Qm54UjlXNzZPWkpZSGFRd0ZBZ01CQUFHallUQmZNQTRHQTFVZER3RUIvd1FFCkF3SUNwREFkQmdOVkhTVUVGakFVQmdnckJnRUZCUWNEQVFZSUt3WUJCUVVIQXdJd0R3WURWUjBUQVFIL0JBVXcKQXdFQi96QWRCZ05WSFE0RUZnUVVqcDU1bndXOXJTSHFrVTdmdWVNZGVYbGVZdGt3RFFZSktvWklodmNOQVFFTApCUUFEZ2dFQkFKcXpZQWg2WUNINmFpeG5CQ1A5Sis4VUxVbk9oTWxvZmpURTVFWE1DNElTWEJFNlVsT0M4R252ClhkZnNzWERXUnhXKzE2a25vOC9qM21DcGFRM1VES3oyczloS2U5U2k4djZzc2FCYm84VnBlVDByWDV1ZExWcHQKTzFpMkFYNnIzVUVqcmc2dDdrYzgwbGF0cWwwSjVHVHcyd1RJdllOTXptZmZWY3EyQkNDWE83bm9lZk5ncnJzcwpKZkdZUy9qOWV0dllZdG1uVGRrcHNEbVNnQ0JFdmFmNEc3dXZEYkhiQlB1M2JadnNUUE5CbEhJcEJNc2dQcGdPCllTZTdZRGVlUVRwZWgwRlpOS0dtTnhjWFVET1dpK1MvL3FrenBDTTVZYnN6SFlIY3o1cnlZZThEMDRKQ09RS28KRTBZUXlRMmpQMnJiWkRTUG0wTVJBMFEyUU55RHJqTT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  ca.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb1FJQkFBS0NBUUVBc0NqaWk5ZFhScWJRYmtraEFRREoxdC9LeHUxUTF6R01QRCs2d1RKTWxaWERUbUR3CktMUG4zNzROTE9xRmI2cUROWEsvdVl1RmdsTWw5blYzdnRTdlJiZndBbTRjRUdoelAwZTFzdnYrNTVMeFpRMEsKQVhUZ0M4K3pWYWZPV21xcW1jdEdEbVBubWpYMTA4a3ZrNjJ2bzljcGRYV2cvVkZhWTc1S09kL2txR09TRnlFdgpDeTl4bmp6QXhTeGUzY2JnYy9WSFVhZzF5TmlOMWZ5eXAxTmM1MHQ3QURkbURtVlQzSWVTYlgrbUFXa2NlTDEwCkZCWm16TTNSWVN6eGg5VFFPay9yNHdDajRZbHNUL0hnaVF5VGVoZFUyS09rTGZGSHNyNDNDN25rMm5zT0dMQlMKMi9tMGVvOXV4R0kydEptYUEzNHZRWjhVZlZ1K2ptU1dCMmtNQlFJREFRQUJBb0lCQUFYck9jRnRHTmVjM3ovMQpZUkNCa0VhUittUTRzUkNwNzRaT3RkMnI3UHJScjJCQXpaRHdpb2Z3QU0xVGkrdzJsSFlGUnYvYStqOW92OHZLCklwM2MwNDdLSVZ4VGlzbmFXSlQxdWRzcnNHTGpnd3pjSlV2ck8yUHFOS0phSXdyU3JxekFNYmhtRHZBVmhBNzcKb1llYXZGNEs2cSt4cGhrYzFLYXBUQ0VwcnFzaHJ3NUZnQWE0QmZKYkpMQnhjMCtmTWx2UWE4b1ZZdzBtSVFIcwpiRHArNnB6RnpDelBvUThuU3o5K29BaUN0YzZwSE1nR0ZPc0FMdTZ6U1ZjUHhlK20yRzVMd2VYVmtiOEFSR1hYCmx5RnVRU0tCQlRic1lZTm5vTmU1dWpGdHVqVjZXeDd1V2FVQ0NVUkJ4Wm12VnRJSFVCcFpCTGlPbmtDQ2o0SlEKemp0OU53RUNnWUVBMmt5TTBCUlMwMXY3cEVHeXBCcWdnNGlTWlFvQzNycXhRYy9QNXA1TUNBZFIxdTMzb2xPawoxblJ1WWkrQ0R2Ym5RQmQzbzh5WnpwZHhGNG1nR094Nit6aUdJcjhqTVB1U09pNFRtWTM5dGZJT0NaYXNkeVpCCnZvcEM5eHQ5ek11Rk5TdklpMkE4ckJ3MStLclBNK3VxV0FOek51djFCbzhXa1FsbU1OQlBUMkVDZ1lFQXpwVkUKME44anNORGtjdE0yVkJrZktFRGNpU3JvM3NoQzhydGZBTFdubzRCZERDcnJKTlNGSnRHczVCUFJtNGd4QXB6dAowQ2RGZnY1Mmg4K0Q1UDg5NjZrdGd6TkY1YkhoYU1MRlNQUmkrR3BCbUhXaGp5MDRkWGdyQ283UjRGalZzTWgyClBwc3FTSUpFeUxUSklOcGJtRTJTb3BYcVhnUi9UZmhJK0NHS2N5VUNmMEdveExIUmF4Z25rb2pWT2VZaUhDVnoKN3BSMWJtZVB2OEVMd0h5ZElFRko4bE96UDhpVFlBRWhCQktFTjVwSXFVV2R5VjU3SzhmM3hReFBXTmdtU05kSApLUkZLYkV0UFg2d2dMOFQvOEUvSmZtOWo0bnYwQmRKSnc5cVBha2N1NytJT1NVT2lycDBWM3lYc09tWmplOWo5Ck1LcFVUbDZxcXg3MHRNZjUzK0VDZ1lBMWtWdFExaXZKRThISlRKK1AyeHZMTWxaOWN4VURmK1pzVHMzcHZ6RUQKSXF2K0ZicjN4K3ZuRHdQSCtLT25zdjhTY0dMeVVOeWllNVY4emdDamh0UWxvYTdka0pRVlpiVFBsNEhVMHhvKwoxRDdDSys2QzAvVUo4T2tvU2JSK2VrcWZGcndpcTlXaEM3YU9YT0t5bEN5Z0o2MVlYNHR3YWJZaEg3cThMT1piCnlRS0JnUURYRVFWWm9xVi92bzY0TlNsRm04dGs5Qlc2S29VQVYxbStJR2xCTXJrelhWVDhlcjJYYWxWVGpsZWkKN1U5WmVNMlVjVXdzMkNGU1VQMkx5TFh1dTZab2lzRmZHTUc4V3BNSXI4Z1FVNGVTQUN5a3dLMmVIRThHeGFjagowZzBLK0lSc3ZGVEUyb2lqUWpsV29xb2daU1lnMmM0NTVXOEdjQmFxODN5c05MUFNKZz09Ci0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
---
# Source: cilium/templates/hubble/tls-helm/relay-client-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: hubble-relay-client-certs
  namespace: kube-system
type: kubernetes.io/tls
data:
  ca.crt:  LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURFekNDQWZ1Z0F3SUJBZ0lRSStsbm9kSS9zSnVwa0JYMW9UZG4vVEFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3TmpJMU1EVXpNekF5V2hjTk1qZ3dOakkwTURVegpNekF5V2pBVU1SSXdFQVlEVlFRREV3bERhV3hwZFcwZ1EwRXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRQ3dLT0tMMTFkR3B0QnVTU0VCQU1uVzM4ckc3VkRYTVl3OFA3ckJNa3lWbGNOT1lQQW8KcytmZnZnMHM2b1Z2cW9NMWNyKzVpNFdDVXlYMmRYZSsxSzlGdC9BQ2Jod1FhSE0vUjdXeSsvN25rdkZsRFFvQgpkT0FMejdOVnA4NWFhcXFaeTBZT1krZWFOZlhUeVMrVHJhK2oxeWwxZGFEOVVWcGp2a281MytTb1k1SVhJUzhMCkwzR2VQTURGTEY3ZHh1Qno5VWRScURYSTJJM1YvTEtuVTF6blMzc0FOMllPWlZQY2g1SnRmNllCYVJ4NHZYUVUKRm1iTXpkRmhMUEdIMU5BNlQrdmpBS1BoaVd4UDhlQ0pESk42RjFUWW82UXQ4VWV5dmpjTHVlVGFldzRZc0ZMYgorYlI2ajI3RVlqYTBtWm9EZmk5Qm54UjlXNzZPWkpZSGFRd0ZBZ01CQUFHallUQmZNQTRHQTFVZER3RUIvd1FFCkF3SUNwREFkQmdOVkhTVUVGakFVQmdnckJnRUZCUWNEQVFZSUt3WUJCUVVIQXdJd0R3WURWUjBUQVFIL0JBVXcKQXdFQi96QWRCZ05WSFE0RUZnUVVqcDU1bndXOXJTSHFrVTdmdWVNZGVYbGVZdGt3RFFZSktvWklodmNOQVFFTApCUUFEZ2dFQkFKcXpZQWg2WUNINmFpeG5CQ1A5Sis4VUxVbk9oTWxvZmpURTVFWE1DNElTWEJFNlVsT0M4R252ClhkZnNzWERXUnhXKzE2a25vOC9qM21DcGFRM1VES3oyczloS2U5U2k4djZzc2FCYm84VnBlVDByWDV1ZExWcHQKTzFpMkFYNnIzVUVqcmc2dDdrYzgwbGF0cWwwSjVHVHcyd1RJdllOTXptZmZWY3EyQkNDWE83bm9lZk5ncnJzcwpKZkdZUy9qOWV0dllZdG1uVGRrcHNEbVNnQ0JFdmFmNEc3dXZEYkhiQlB1M2JadnNUUE5CbEhJcEJNc2dQcGdPCllTZTdZRGVlUVRwZWgwRlpOS0dtTnhjWFVET1dpK1MvL3FrenBDTTVZYnN6SFlIY3o1cnlZZThEMDRKQ09RS28KRTBZUXlRMmpQMnJiWkRTUG0wTVJBMFEyUU55RHJqTT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURTRENDQWpDZ0F3SUJBZ0lRT29PdmJJRnpxbXQ2aVBaQ2ZTcTlIREFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3TmpJMU1EVXpNekF5V2hjTk1qWXdOakkxTURVegpNekF5V2pBak1TRXdId1lEVlFRRERCZ3FMbWgxWW1Kc1pTMXlaV3hoZVM1amFXeHBkVzB1YVc4d2dnRWlNQTBHCkNTcUdTSWIzRFFFQkFRVUFBNElCRHdBd2dnRUtBb0lCQVFDMG9ZczdlMzlFU0FVRTJhenVodDlxdzdtK3lsR2sKaWVlMGdrTVE2clZBdVhDTHRIdDluMng3NEFGZVphckt2N2ZyREJVRTRaUUkvdXl1QjZYT3NhbEJ3eTd6cm1kSQpjODhNdFRtUmgwVElkOXJ0UjFJTlZrWFpaTVNUaXpsdnU3TXhWbUVYOCtiaFpPYlVDTGtXUW5WczBvQkxkcEU5Ck9VUnVpV2grOXFhQ1VCdG82RXJLRmRIdFI5T0N2UEpIWFZNcmJoUWNtbi9GOUNHQk9ncjFnWW9lTVQ0K1Q1WlIKNG1JM1RJV0tGVHozakI5NDQ3cEk3S09BaFphRStqZEdmL3lLa2NZVG9mVXdhTElkNU04NllyVUwyV0dDUm14NApkeWNpMVBlcHU5YnA2ZVdCOUwxZnRPbVVRblBhZ1pOdER6WUFoam1pV2VXMkR6RjhOMG1TQUIzUEFnTUJBQUdqCmdZWXdnWU13RGdZRFZSMFBBUUgvQkFRREFnV2dNQjBHQTFVZEpRUVdNQlFHQ0NzR0FRVUZCd01CQmdnckJnRUYKQlFjREFqQU1CZ05WSFJNQkFmOEVBakFBTUI4R0ExVWRJd1FZTUJhQUZJNmVlWjhGdmEwaDZwRk8zN25qSFhsNQpYbUxaTUNNR0ExVWRFUVFjTUJxQ0dDb3VhSFZpWW14bExYSmxiR0Y1TG1OcGJHbDFiUzVwYnpBTkJna3Foa2lHCjl3MEJBUXNGQUFPQ0FRRUFIUXJGQUJndkFUQzAvR1JMV0xsdTJVMEx4bDJheFZPaVFUcnpKLzczR1VCYk1jNDEKdXNEUzRaOWEzbGlNY1phTytKbU4xQ24xeUErcGxuTWR6aGliSDZVNytmdXEvK1htQ0RoMXhwLzI0b29WcTRhMgpQZ1RkMGJhZE8zYjlSVW5ybVAvejN6Vm5qdTc3aHNoQ2tOTGVITXJQQWphb015cUF5S3NyTnZlSUhMeDRiNTdpCkdvQXVjKzNrRWFJVGFORnZQRUJ4M3BoenNwWlg1bWt0RnUybVNjVysvZjE1dnN0VzREb29FcDhmbnhOdmIybTkKSzVtWEV3UVlvdGw5cm5xeTBIR2ZVMktDd2dvdHFaNzd6WXFSS3JsMFpZV1VNeUZYODQwd3BsMW1SNC9wcm51cQpvSXB0TTcvV3UydUp5MU8vSzV0VisvWHhJZTRXazRTdmpUTW9Fdz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
  tls.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBdEtHTE8zdC9SRWdGQk5tczdvYmZhc081dnNwUnBJbm50SUpERU9xMVFMbHdpN1I3CmZaOXNlK0FCWG1XcXlyKzM2d3dWQk9HVUNQN3NyZ2VsenJHcFFjTXU4NjVuU0hQUERMVTVrWWRFeUhmYTdVZFMKRFZaRjJXVEVrNHM1Yjd1ek1WWmhGL1BtNFdUbTFBaTVGa0oxYk5LQVMzYVJQVGxFYm9sb2Z2YW1nbEFiYU9oSwp5aFhSN1VmVGdyenlSMTFUSzI0VUhKcC94ZlFoZ1RvSzlZR0tIakUrUGsrV1VlSmlOMHlGaWhVODk0d2ZlT082ClNPeWpnSVdXaFBvM1JuLzhpcEhHRTZIMU1HaXlIZVRQT21LMUM5bGhna1pzZUhjbkl0VDNxYnZXNmVubGdmUzkKWDdUcGxFSnoyb0dUYlE4MkFJWTVvbG5sdGc4eGZEZEprZ0FkendJREFRQUJBb0lCQUV1UGRDWHEwRjhvM1dpZApBams1bEVZZUlCcE9tZjZCYmJyVjd1WXB1SzZkcEJYYzV2ZXk4L2VSeWlESjJMczluZHNtVDdpZUFJWU8xY1VyCkQ5STZBWHF3QW5rUFVNYy9JckxITUpEUERCZnNBMW5VeHQ4cllzYkEzM1owL0E3Z2J1SkpwdzRWQ2xUcEY2SkYKRDkvZTV5NGhsR2Q4N3Q2MGtRcklVajBpUXA4cDNOOTAzbTRXcU1ZVk0wb244bEZIeUVnVWJod1MxMVN3V0R3WApMVGdEcVRhSkpSeUtoYWE3ZW1zRjlvbWZDeWdjN3RMd2Y2RWpEQkhmNHN0b0JESFdSbTQxbnhEY1daZXNkeVUvCm1HNFRNYUh2V2Y0aTNLRnBKank0TVRXS1crMXhWeVByY0pLelo4RmxzR3RjRGdJeG5jbmNoK296aER2OWlKTDcKbjVkWXBUa0NnWUVBeE10eUNIYU4ranh4SENFb3VXdmNCRngwREMyUlFIYStsZDNKRTNnWG5lbmk5UGxpWXVVZwpNZkNjWVFVemlrK2RjWG9EbWlVMXZrdTYrL0lSWHA4MWFJUGRpcFdDOHZuY0VSVjIyakpIQStPR3VVcU42Q3JvCkliSElLMm80QXE5a2FXYW5UQVdOMTlCaCtJLzhHS2RETHNEaEdpd21sb0J2M0lJeVVUa0NpTVVDZ1lFQTZ2azQKRm9xQW1QcS90cVpFUzB3N1lVZS9RL1oxMDBPcnBLM0Q1T3ljZWVwTyt3TEM0U1ZRQ2o5T3VWQmNDN3F4QXkxNApCN0kyOGR3Z3drUkxpdmp3SU5qcmFHVDE5cytzTEtEd2ZHOWhUeWVNU0VRQVpLbldvTUxSaFd3V3kzR0UvQVA0CmkvMzFqaWhxR3lnS2o0ZFIrejZ3aHRFU3lBQWducmF3NEdDYnJZTUNnWUVBcmw2cGtyQWhTdWxGTzZ4eDNpR2cKMkVobkZ1ZEZQWDQ1anFidVpJN1ROanVudW5KQjUraW5KempRQnZOSjRMSjhpYkNZQW53WDY1NUVkcnJkQXg5RQpmbS9nMjh0d05RU0pKcVlESW9ETUJia1RoWmgydHBGV0Q0enNGUFBQM3lremFtVG50V2R5Y0JnV3h0d2xmbDZ1CkczNFJ0bFFLZU80aXI1cTVKTmpEMHhVQ2dZQUcxMEtleFdHQkVxdktNWVVEZkRDdVlGeGRLaXU3L3RoY2J3S3AKQTRwNnNpdWlleTRaUi9EUW00ODdMZS9BRjZ0WG9GZENRaG4vYUowN2lxbDRYazcvWmRGVXRMdkVkNzlYZlVnRApGMnNKMXVqcW9iQXhQaENWbFpaci8vMlo1ckFzZGlFaVVqNTM2UTFOeFJpcG5STHg4WjFLRDRRd2RuQjhybXp2CjIyQXM2UUtCZ1FDaDdIRlRVcnQwVW1uMWs2SWRMZGtRdWpEa21rZHg3WnFvYjM4R0hNaklDeWFpMHBaWThaQjgKQkZsOVVXVC93ejNBbkI4eDR4NkxjZG1TNFFpTG52dVRGMVBIWGVBUXZPN2JTUmF6MzJNbERjTDB3cXBkOTYyNQpSY3htM0xSRG0vNnY2eFdGUzdvK0I5ZjJ3eFBlUkx6aXJaU1VFV2FCTkpld0dUTWdnUkpZc3c9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
---
# Source: cilium/templates/hubble/tls-helm/server-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: hubble-server-certs
  namespace: kube-system
type: kubernetes.io/tls
data:
  ca.crt:  LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURFekNDQWZ1Z0F3SUJBZ0lRSStsbm9kSS9zSnVwa0JYMW9UZG4vVEFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3TmpJMU1EVXpNekF5V2hjTk1qZ3dOakkwTURVegpNekF5V2pBVU1SSXdFQVlEVlFRREV3bERhV3hwZFcwZ1EwRXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRQ3dLT0tMMTFkR3B0QnVTU0VCQU1uVzM4ckc3VkRYTVl3OFA3ckJNa3lWbGNOT1lQQW8KcytmZnZnMHM2b1Z2cW9NMWNyKzVpNFdDVXlYMmRYZSsxSzlGdC9BQ2Jod1FhSE0vUjdXeSsvN25rdkZsRFFvQgpkT0FMejdOVnA4NWFhcXFaeTBZT1krZWFOZlhUeVMrVHJhK2oxeWwxZGFEOVVWcGp2a281MytTb1k1SVhJUzhMCkwzR2VQTURGTEY3ZHh1Qno5VWRScURYSTJJM1YvTEtuVTF6blMzc0FOMllPWlZQY2g1SnRmNllCYVJ4NHZYUVUKRm1iTXpkRmhMUEdIMU5BNlQrdmpBS1BoaVd4UDhlQ0pESk42RjFUWW82UXQ4VWV5dmpjTHVlVGFldzRZc0ZMYgorYlI2ajI3RVlqYTBtWm9EZmk5Qm54UjlXNzZPWkpZSGFRd0ZBZ01CQUFHallUQmZNQTRHQTFVZER3RUIvd1FFCkF3SUNwREFkQmdOVkhTVUVGakFVQmdnckJnRUZCUWNEQVFZSUt3WUJCUVVIQXdJd0R3WURWUjBUQVFIL0JBVXcKQXdFQi96QWRCZ05WSFE0RUZnUVVqcDU1bndXOXJTSHFrVTdmdWVNZGVYbGVZdGt3RFFZSktvWklodmNOQVFFTApCUUFEZ2dFQkFKcXpZQWg2WUNINmFpeG5CQ1A5Sis4VUxVbk9oTWxvZmpURTVFWE1DNElTWEJFNlVsT0M4R252ClhkZnNzWERXUnhXKzE2a25vOC9qM21DcGFRM1VES3oyczloS2U5U2k4djZzc2FCYm84VnBlVDByWDV1ZExWcHQKTzFpMkFYNnIzVUVqcmc2dDdrYzgwbGF0cWwwSjVHVHcyd1RJdllOTXptZmZWY3EyQkNDWE83bm9lZk5ncnJzcwpKZkdZUy9qOWV0dllZdG1uVGRrcHNEbVNnQ0JFdmFmNEc3dXZEYkhiQlB1M2JadnNUUE5CbEhJcEJNc2dQcGdPCllTZTdZRGVlUVRwZWgwRlpOS0dtTnhjWFVET1dpK1MvL3FrenBDTTVZYnN6SFlIY3o1cnlZZThEMDRKQ09RS28KRTBZUXlRMmpQMnJiWkRTUG0wTVJBMFEyUU55RHJqTT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURWekNDQWorZ0F3SUJBZ0lSQUsrMm5rSjZDSVdZYXNLU1ZyNnJPUDR3RFFZSktvWklodmNOQVFFTEJRQXcKRkRFU01CQUdBMVVFQXhNSlEybHNhWFZ0SUVOQk1CNFhEVEkxTURZeU5UQTFNek13TWxvWERUSTJNRFl5TlRBMQpNek13TWxvd0tqRW9NQ1lHQTFVRUF3d2ZLaTVrWldaaGRXeDBMbWgxWW1Kc1pTMW5jbkJqTG1OcGJHbDFiUzVwCmJ6Q0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQVBzd3RVVk8zZ0phWjN0S05CcGoKK2NlU0tjUnZLUmZEbTBLUnNGNXVVTUVWM1B0ZUVydlNwRUs4cEN2SzZ2Z1RJTXhkbHdaalIrS2lkVFI1ZlhXQwp2Qmh2aGI3MVlMMWJCekUrRHBLOEFiRWhldVdnN1diNVI0dFVpQVU0b2R1Y0tKRThUOXdhdldPaWlpNDZSZVVwCnJTeHBLeGt4WnlKd0czUUN0b1Y2S0pwcUU4QVAyQXptUFpPbVM1Mm9Da2VkSGxnYyt1TjN5bkFkS2pZSFkvUEUKTkVveHA1Umpyd1FIUTY2a2VWejFJVmdRMm8zWFZlNUlpcmg1c1RZeDVBaTEyYlNoMnpza05pbDB3UlJvSkRqWQorQWlxZC82aUdsUURPU2lLUGFPS0hXY3FOUzFQQTFRVnFvV0NHV053dVFuWEorYVlJSXVmZ1lpazZkM1pKOWpzCllJOENBd0VBQWFPQmpUQ0JpakFPQmdOVkhROEJBZjhFQkFNQ0JhQXdIUVlEVlIwbEJCWXdGQVlJS3dZQkJRVUgKQXdFR0NDc0dBUVVGQndNQ01Bd0dBMVVkRXdFQi93UUNNQUF3SHdZRFZSMGpCQmd3Rm9BVWpwNTVud1c5clNIcQprVTdmdWVNZGVYbGVZdGt3S2dZRFZSMFJCQ013SVlJZktpNWtaV1poZFd4MExtaDFZbUpzWlMxbmNuQmpMbU5wCmJHbDFiUzVwYnpBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQUx0Uk9URmxCZlVWZEtMV0Q2QUZmdkJXS1JXMUIKSlZjUk55QWlGTlZ6VXJZaWpOUm1PTXIrYVI1MEV2Ly9pKzUzUGZ0aytpOUVTNi9FazIrWC9yV2RHTXZhQmRtNQp0d041bC9TWEVKS05MbjloR2VBc1k4K2RRL0RZemZWQ1JzQlo4dVpsK0JEL3VocWdxV0htVW91R0lOYnVwYy9YCk9BV240eXBrWWh2WHJxM1Y1cWVDQ2kyaTRTaTRRVVVVcUo4NGkxcStjZXBFTXRMaU16QTBFdnpOQ09ySEVyVVcKYllSTFhRenRldmRNeE9nUCtwVXRKNXFCdytvTGpmZHJmK052TmRWYmJrSG1PZUlQMTlxbXZSWGhPVEo5QVFYZApSYmlnaEd4TnJoNEpXR1JRL25aaEtqbFlzVVVjY2g0bWxIUWt3bitxd08yV2ZjQU1xZm9JTnBsbS9BPT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  tls.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcFFJQkFBS0NBUUVBK3pDMVJVN2VBbHBuZTBvMEdtUDV4NUlweEc4cEY4T2JRcEd3WG01UXdSWGMrMTRTCnU5S2tRcnlrSzhycStCTWd6RjJYQm1OSDRxSjFOSGw5ZFlLOEdHK0Z2dlZndlZzSE1UNE9rcndCc1NGNjVhRHQKWnZsSGkxU0lCVGloMjV3b2tUeFAzQnE5WTZLS0xqcEY1U210TEdrckdURm5JbkFiZEFLMmhYb29tbW9Ud0EvWQpET1k5azZaTG5hZ0tSNTBlV0J6NjQzZktjQjBxTmdkajg4UTBTakdubEdPdkJBZERycVI1WFBVaFdCRGFqZGRWCjdraUt1SG14TmpIa0NMWFp0S0hiT3lRMktYVEJGR2drT05qNENLcDMvcUlhVkFNNUtJbzlvNG9kWnlvMUxVOEQKVkJXcWhZSVpZM0M1Q2RjbjVwZ2dpNStCaUtUcDNka24yT3hnandJREFRQUJBb0lCQURSWE9lNXZPS09VNHVzMQoweFdNcjRkK1ZXV3hKQWJubzNxRGtSU2NPQWVEM3NBaUloVXhGemt3eGFTNmE2dTFrS2dFK0d0RVZMNU15ODliCllXRVRGTTZpcm1QVURZeG5ZMkJIWmhIOVN2ejExUDMwUW9PcWZkWHlqMFZIUDdMYkh6amtNRi9VMHBIb1ZKSzkKWWNNV3BCY1U4djRVNVVDdnk0aW82QTk0SE8zUHN3OEN1blh1TXJnVyt4amxvT0V1TmZNbEswQ3RqUUorOXE0awprYy9LbE9HcFBPVHpFQWdvblcrR25RZllxckVtaHZ2OUNsQjhGVUVubGx3cHdoQzJRaEEreTVlK2kyNGlGTGtwCnBxR0t5ckJ6dnRZSytRcUVDb3J4ekYxMjZjUnpvVm90NlhIcUFPTDZ1WU9TRnpHR3dSdWVJZ2ttdFhPVjM1R2QKOEIrMFFvRUNnWUVBLzFFbDRWc29rMVNPelZPNHBxMlo3UnNSQXA3R0x2YUNodnd6TGY4U0dTT3JGN1ZUTVpUTQpaR3dZeXplbHNDN3JLZTFjUGplOG1vdkp5ZmpCRHJGT1QrRFhxNnBJTStyclRnVWVJWHBEUDN2bTJlazEycm9vCnpoajE1MTU2YTFzNW5ocTNhWnBoV0FER0syUEZxTGlxbjFzMFBUaUNBdkMydlV4MkppOXBDTGNDZ1lFQSs5eTcKNVNLb0RwdmtTeWF0cXlqem5KZVNFdHAvM0VMd3N1Q0pFNGZpZFlEWDM0b3VpbXZySWY2SWNnbFBHREdzTmcyNwo2V3NrTTJuSXpybDIzWXNqWmsvekRreTdqanF2TUVNUE9kK3pvcjVJcDZYMThGQkZzOURQY0RxQWZPVFlvcys0CkU0RkFNVWdVQnpuS0RreTJtMlYyT25pWUMva01qeHUwMjUwaUh1a0NnWUVBdWtleW82R25FUmQ0dVVhRVN0Z08Kbm5oSkNPaGZJSlNxMTJIYTFZeHMzL3F1TWpZUjVQTHp6YkV3eGRSc0J3ZTBmSHE1K29zZ0NJSkZVQjgyZkVuUgpJV2FpOUpUZzZVQlZQaTl0dEc5SDhXR3RKUUNLVW5QUW9jNkVXN01MRHBrWWlNcGxWNTlUdHFtWjdMNTIwSXNyCnNla1JURG1XWWg3T3RYNjhGVkF5Q2pFQ2dZRUFxTU9OdThudkptcmJIR2c4Y3JZc0ZyK1JoOFNWYkhnR1pUWUQKWSt6bmw2alAvZC9QczcwQWYzVFk1T0RMK1FBL3pyQ0JPN1VwT3JJbGRpL2NNRE10Y3o4Yk5IZkNMVm14VGZ1QgpWbHhKT0VHYzJZbGhOTGYxSExwTVpYMHQzNEpRanpmMHRrMGpRR0oxMlNtbDlOTCtnVDRKYk1DbDBVLytWRjVTClg5MzRvUkVDZ1lFQS9BZWhtTGhPazd6Z2xROTFnU3BzOWxsN05kRWpnU25aYVFrQWVHT0RMdHBhVmk5YURabDMKN0FseUY5ZlphM3J1aFVLWnVMOHl6b3ZwcWxsVTk5RTR1Vm5BUkdKQytsQnlRYWloUVhWRHhud2xiRmFwcVBYZwowd1hkRmt1Zld4MnZlNWdoME1pTGROUG1vbks0RXo3VVhsSmR1dHViVjc3dXVpQlhadXNER2QwPQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
---
# Source: cilium/templates/cilium-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:

  # Identity allocation mode selects how identities are shared between cilium
  # nodes by setting how they are stored. The options are "crd", "kvstore" or
  # "doublewrite-readkvstore" / "doublewrite-readcrd".
  # - "crd" stores identities in kubernetes as CRDs (custom resource definition).
  #   These can be queried with:
  #     kubectl get ciliumid
  # - "kvstore" stores identities in an etcd kvstore, that is
  #   configured below. Cilium versions before 1.6 supported only the kvstore
  #   backend. Upgrades from these older cilium versions should continue using
  #   the kvstore by commenting out the identity-allocation-mode below, or
  #   setting it to "kvstore".
  # - "doublewrite" modes store identities in both the kvstore and CRDs. This is useful
  #   for seamless migrations from the kvstore mode to the crd mode. Consult the
  #   documentation for more information on how to perform the migration.
  identity-allocation-mode: crd

  identity-heartbeat-timeout: "30m0s"
  identity-gc-interval: "15m0s"
  cilium-endpoint-gc-interval: "5m0s"
  nodes-gc-interval: "5m0s"

  # If you want to run cilium in debug mode change this value to true
  debug: "false"
  # The agent can be put into the following three policy enforcement modes
  # default, always and never.
  # https://docs.cilium.io/en/latest/security/policy/intro/#policy-enforcement-modes
  enable-policy: "default"
  # If you want metrics enabled in all of your Cilium agents, set the port for
  # which the Cilium agents will have their metrics exposed.
  # This option deprecates the "prometheus-serve-addr" in the
  # "cilium-metrics-config" ConfigMap
  # NOTE that this will open the port on ALL nodes where Cilium pods are
  # scheduled.
  prometheus-serve-addr: ":9962"
  # A space-separated list of controller groups for which to enable metrics.
  # The special values of "all" and "none" are supported.
  controller-group-metrics:
    all
  # If you want metrics enabled in cilium-operator, set the port for
  # which the Cilium Operator will have their metrics exposed.
  # NOTE that this will open the port on the nodes where Cilium operator pod
  # is scheduled.
  operator-prometheus-serve-addr: ":9963"
  enable-metrics: "true"
  skip-crd-creation: "true"
  enable-envoy-config: "true"
  envoy-config-retry-interval: "15s"
  enable-ingress-controller: "true"
  enforce-ingress-https: "true"
  enable-ingress-proxy-protocol: "false"
  enable-ingress-secrets-sync: "true"
  ingress-secrets-namespace: "cilium-secrets"
  ingress-lb-annotation-prefixes: "lbipam.cilium.io nodeipam.cilium.io service.beta.kubernetes.io service.kubernetes.io cloud.google.com"
  ingress-default-lb-mode: shared
  ingress-shared-lb-service-name: cilium-ingress
  ingress-hostnetwork-enabled: "false"
  ingress-hostnetwork-shared-listener-port: "8080"
  ingress-hostnetwork-nodelabelselector: ""
  enable-gateway-api: "true"
  enable-gateway-api-secrets-sync: "true"
  enable-gateway-api-proxy-protocol: "false"
  enable-gateway-api-app-protocol: "false"
  enable-gateway-api-alpn: "false"
  gateway-api-xff-num-trusted-hops: "0"
  gateway-api-service-externaltrafficpolicy: "Cluster"
  gateway-api-secrets-namespace: "cilium-secrets"
  gateway-api-hostnetwork-enabled: "false"
  gateway-api-hostnetwork-nodelabelselector: ""
  enable-policy-secrets-sync: "true"
  policy-secrets-only-from-secrets-namespace: "true"
  policy-secrets-namespace: "cilium-secrets"
  loadbalancer-l7: "envoy"
  loadbalancer-l7-ports: ""
  loadbalancer-l7-algorithm: "round_robin"

  # Enable IPv4 addressing. If enabled, all endpoints are allocated an IPv4
  # address.
  enable-ipv4: "true"

  # Enable IPv6 addressing. If enabled, all endpoints are allocated an IPv6
  # address.
  enable-ipv6: "false"
  # Users who wish to specify their own custom CNI configuration file must set
  # custom-cni-conf to "true", otherwise Cilium may overwrite the configuration.
  custom-cni-conf: "false"
  enable-bpf-clock-probe: "false"
  # If you want cilium monitor to aggregate tracing for packets, set this level
  # to "low", "medium", or "maximum". The higher the level, the less packets
  # that will be seen in monitor output.
  monitor-aggregation: medium

  # The monitor aggregation interval governs the typical time between monitor
  # notification events for each allowed connection.
  #
  # Only effective when monitor aggregation is set to "medium" or higher.
  monitor-aggregation-interval: "5s"

  # The monitor aggregation flags determine which TCP flags which, upon the
  # first observation, cause monitor notifications to be generated.
  #
  # Only effective when monitor aggregation is set to "medium" or higher.
  monitor-aggregation-flags: all
  # Specifies the ratio (0.0-1.0] of total system memory to use for dynamic
  # sizing of the TCP CT, non-TCP CT, NAT and policy BPF maps.
  bpf-map-dynamic-size-ratio: "0.0025"
  # bpf-policy-map-max specifies the maximum number of entries in endpoint
  # policy map (per endpoint)
  bpf-policy-map-max: "16384"
  # bpf-lb-map-max specifies the maximum number of entries in bpf lb service,
  # backend and affinity maps.
  bpf-lb-map-max: "65536"
  bpf-lb-external-clusterip: "false"
  bpf-lb-source-range-all-types: "false"
  bpf-lb-algorithm-annotation: "false"
  bpf-lb-mode-annotation: "false"

  bpf-distributed-lru: "false"
  bpf-events-drop-enabled: "true"
  bpf-events-policy-verdict-enabled: "true"
  bpf-events-trace-enabled: "true"

  # Pre-allocation of map entries allows per-packet latency to be reduced, at
  # the expense of up-front memory allocation for the entries in the maps. The
  # default value below will minimize memory usage in the default installation;
  # users who are sensitive to latency may consider setting this to "true".
  #
  # This option was introduced in Cilium 1.4. Cilium 1.3 and earlier ignore
  # this option and behave as though it is set to "true".
  #
  # If this value is modified, then during the next Cilium startup the restore
  # of existing endpoints and tracking of ongoing connections may be disrupted.
  # As a result, reply packets may be dropped and the load-balancing decisions
  # for established connections may change.
  #
  # If this option is set to "false" during an upgrade from 1.3 or earlier to
  # 1.4 or later, then it may cause one-time disruptions during the upgrade.
  preallocate-bpf-maps: "false"

  # Name of the cluster. Only relevant when building a mesh of clusters.
  cluster-name: default
  # Unique ID of the cluster. Must be unique across all conneted clusters and
  # in the range of 1 and 255. Only relevant when building a mesh of clusters.
  cluster-id: "0"

  # Encapsulation mode for communication between nodes
  # Possible values:
  #   - disabled
  #   - vxlan (default)
  #   - geneve

  routing-mode: "tunnel"
  tunnel-protocol: "geneve"
  tunnel-source-port-range: "0-0"
  service-no-backend-response: "reject"


  # Enables L7 proxy for L7 policy enforcement and visibility
  enable-l7-proxy: "true"

  enable-ipv4-masquerade: "true"
  enable-ipv4-big-tcp: "false"
  enable-ipv6-big-tcp: "false"
  enable-ipv6-masquerade: "true"
  enable-tcx: "true"
  datapath-mode: "veth"
  enable-bpf-masquerade: "true"
  enable-masquerade-to-route-source: "false"
  enable-ip-masq-agent: "true"
  enable-ipsec: "true"
  ipsec-key-file: /etc/ipsec/keys
  enable-ipsec-key-watcher: "true"
  ipsec-key-rotation-duration: "5m"
  enable-ipsec-encrypted-overlay: "false"

  enable-xt-socket-fallback: "true"
  install-no-conntrack-iptables-rules: "false"
  iptables-random-fully: "false"

  auto-direct-node-routes: "false"
  direct-routing-skip-unreachable: "false"
  enable-local-redirect-policy: "false"
  enable-runtime-device-detection: "true"

  kube-proxy-replacement: "true"
  kube-proxy-replacement-healthz-bind-address: ""
  bpf-lb-sock: "false"
  enable-health-check-nodeport: "true"
  enable-health-check-loadbalancer-ip: "false"
  node-port-bind-protection: "true"
  enable-auto-protect-node-port-range: "true"
  bpf-lb-acceleration: "disabled"
  enable-experimental-lb: "false"
  enable-svc-source-range-check: "true"
  enable-l2-neigh-discovery: "true"
  arping-refresh-period: "30s"
  k8s-require-ipv4-pod-cidr: "false"
  k8s-require-ipv6-pod-cidr: "false"
  enable-k8s-networkpolicy: "true"
  enable-endpoint-lockdown-on-policy-overflow: "false"
  # Tell the agent to generate and write a CNI configuration file
  write-cni-conf-when-ready: /host/etc/cni/net.d/05-cilium.conflist
  cni-exclusive: "true"
  cni-log-file: "/var/run/cilium/cilium-cni.log"
  enable-endpoint-health-checking: "true"
  enable-health-checking: "true"
  health-check-icmp-failure-threshold: "3"
  enable-well-known-identities: "false"
  enable-node-selector-labels: "false"
  synchronize-k8s-nodes: "true"
  operator-api-serve-addr: "127.0.0.1:9234"

  enable-hubble: "true"
  # UNIX domain socket for Hubble server to listen to.
  hubble-socket-path: "/var/run/cilium/hubble.sock"
  # Address to expose Hubble metrics (e.g. ":7070"). Metrics server will be disabled if this
  # field is not set.
  hubble-metrics-server: ":9965"
  hubble-metrics-server-enable-tls: "false"
  enable-hubble-open-metrics: "false"
  # A space separated list of metrics to enable. See [0] for available metrics.
  #
  # https://github.com/cilium/hubble/blob/master/Documentation/metrics.md
  hubble-metrics:
    dns:query;ignoreAAAA
    drop
    tcp
    flow
    icmp
    http
  hubble-export-file-max-size-mb: "10"
  hubble-export-file-max-backups: "5"
  # An additional address for Hubble server to listen to (e.g. ":4244").
  hubble-listen-address: ":4244"
  hubble-disable-tls: "false"
  hubble-tls-cert-file: /var/lib/cilium/tls/hubble/server.crt
  hubble-tls-key-file: /var/lib/cilium/tls/hubble/server.key
  hubble-tls-client-ca-files: /var/lib/cilium/tls/hubble/client-ca.crt
  ipam: "kubernetes"
  ipam-cilium-node-update-rate: "15s"

  default-lb-service-ipam: "lbipam"
  egress-gateway-reconciliation-trigger-interval: "1s"
  enable-vtep: "false"
  vtep-endpoint: ""
  vtep-cidr: ""
  vtep-mask: ""
  vtep-mac: ""
  # Enable L2 announcements
  enable-l2-announcements: "true"
  l2-announcements-lease-duration: "3s"
  l2-announcements-renew-deadline: "1s"
  l2-announcements-retry-period: "500ms"
  procfs: "/host/proc"
  bpf-root: "/sys/fs/bpf"
  cgroup-root: "/run/cilium/cgroupv2"
  enable-k8s-terminating-endpoint: "true"
  enable-sctp: "false"
  remove-cilium-node-taints: "true"
  set-cilium-node-taints: "true"
  set-cilium-is-up-condition: "true"
  unmanaged-pod-watcher-interval: "15"
  # explicit setting gets precedence
  dnsproxy-enable-transparent-mode: "true"
  dnsproxy-socket-linger-timeout: "10"
  tofqdns-dns-reject-response-code: "refused"
  tofqdns-enable-dns-compression: "true"
  tofqdns-endpoint-max-ip-per-hostname: "1000"
  tofqdns-idle-connection-grace-period: "0s"
  tofqdns-max-deferred-connection-deletes: "10000"
  tofqdns-proxy-response-max-delay: "100ms"
  agent-not-ready-taint-key: "node.cilium.io/agent-not-ready"

  mesh-auth-enabled: "true"
  mesh-auth-queue-size: "1024"
  mesh-auth-rotated-identities-queue-size: "1024"
  mesh-auth-gc-interval: "5m0s"

  proxy-xff-num-trusted-hops-ingress: "0"
  proxy-xff-num-trusted-hops-egress: "0"
  proxy-connect-timeout: "2"
  proxy-initial-fetch-timeout: "30"
  proxy-max-requests-per-connection: "0"
  proxy-max-connection-duration-seconds: "0"
  proxy-idle-timeout-seconds: "60"
  proxy-max-concurrent-retries: "128"
  http-retry-count: "3"

  external-envoy-proxy: "true"
  envoy-base-id: "0"
  envoy-access-log-buffer-size: "4096"
  envoy-keep-cap-netbindservice: "true"
  max-connected-clusters: "255"
  clustermesh-enable-endpoint-sync: "false"
  clustermesh-enable-mcs-api: "false"

  nat-map-stats-entries: "32"
  nat-map-stats-interval: "30s"
  enable-internal-traffic-policy: "true"
  enable-lb-ipam: "true"
  enable-non-default-deny-policies: "true"
  enable-source-ip-verification: "true"

# Extra config allows adding arbitrary properties to the cilium config.
# By putting it at the end of the ConfigMap, it's also possible to override existing properties.
---
# Source: cilium/templates/cilium-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ip-masq-agent
  namespace: kube-system
data:
  config: |-
    {"nonMasqueradeCIDRs":["10.233.0.0/16"]}
---
# Source: cilium/templates/cilium-envoy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-envoy-config
  namespace: kube-system
data:
  # Keep the key name as bootstrap-config.json to avoid breaking changes
  bootstrap-config.json: |
    {"admin":{"address":{"pipe":{"path":"/var/run/cilium/envoy/sockets/admin.sock"}}},"applicationLogConfig":{"logFormat":{"textFormat":"[%Y-%m-%d %T.%e][%t][%l][%n] [%g:%#] %v"}},"bootstrapExtensions":[{"name":"envoy.bootstrap.internal_listener","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.bootstrap.internal_listener.v3.InternalListener"}}],"dynamicResources":{"cdsConfig":{"apiConfigSource":{"apiType":"GRPC","grpcServices":[{"envoyGrpc":{"clusterName":"xds-grpc-cilium"}}],"setNodeOnFirstMessageOnly":true,"transportApiVersion":"V3"},"initialFetchTimeout":"30s","resourceApiVersion":"V3"},"ldsConfig":{"apiConfigSource":{"apiType":"GRPC","grpcServices":[{"envoyGrpc":{"clusterName":"xds-grpc-cilium"}}],"setNodeOnFirstMessageOnly":true,"transportApiVersion":"V3"},"initialFetchTimeout":"30s","resourceApiVersion":"V3"}},"node":{"cluster":"ingress-cluster","id":"host~127.0.0.1~no-id~localdomain"},"overloadManager":{"resourceMonitors":[{"name":"envoy.resource_monitors.global_downstream_max_connections","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.resource_monitors.downstream_connections.v3.DownstreamConnectionsConfig","max_active_downstream_connections":"50000"}}]},"staticResources":{"clusters":[{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"ingress-cluster","type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"useDownstreamProtocolConfig":{}}}},{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"egress-cluster-tls","transportSocket":{"name":"cilium.tls_wrapper","typedConfig":{"@type":"type.googleapis.com/cilium.UpstreamTlsWrapperContext"}},"type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"upstreamHttpProtocolOptions":{},"useDownstreamProtocolConfig":{}}}},{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"egress-cluster","type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"useDownstreamProtocolConfig":{}}}},{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"ingress-cluster-tls","transportSocket":{"name":"cilium.tls_wrapper","typedConfig":{"@type":"type.googleapis.com/cilium.UpstreamTlsWrapperContext"}},"type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"upstreamHttpProtocolOptions":{},"useDownstreamProtocolConfig":{}}}},{"connectTimeout":"2s","loadAssignment":{"clusterName":"xds-grpc-cilium","endpoints":[{"lbEndpoints":[{"endpoint":{"address":{"pipe":{"path":"/var/run/cilium/envoy/sockets/xds.sock"}}}}]}]},"name":"xds-grpc-cilium","type":"STATIC","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","explicitHttpConfig":{"http2ProtocolOptions":{}}}}},{"connectTimeout":"2s","loadAssignment":{"clusterName":"/envoy-admin","endpoints":[{"lbEndpoints":[{"endpoint":{"address":{"pipe":{"path":"/var/run/cilium/envoy/sockets/admin.sock"}}}}]}]},"name":"/envoy-admin","type":"STATIC"}],"listeners":[{"address":{"socketAddress":{"address":"0.0.0.0","portValue":9964}},"filterChains":[{"filters":[{"name":"envoy.filters.network.http_connection_manager","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager","httpFilters":[{"name":"envoy.filters.http.router","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.http.router.v3.Router"}}],"internalAddressConfig":{"cidrRanges":[{"addressPrefix":"10.0.0.0","prefixLen":8},{"addressPrefix":"172.16.0.0","prefixLen":12},{"addressPrefix":"192.168.0.0","prefixLen":16},{"addressPrefix":"127.0.0.1","prefixLen":32}]},"routeConfig":{"virtualHosts":[{"domains":["*"],"name":"prometheus_metrics_route","routes":[{"match":{"prefix":"/metrics"},"name":"prometheus_metrics_route","route":{"cluster":"/envoy-admin","prefixRewrite":"/stats/prometheus"}}]}]},"statPrefix":"envoy-prometheus-metrics-listener","streamIdleTimeout":"0s"}}]}],"name":"envoy-prometheus-metrics-listener"},{"address":{"socketAddress":{"address":"127.0.0.1","portValue":9878}},"filterChains":[{"filters":[{"name":"envoy.filters.network.http_connection_manager","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager","httpFilters":[{"name":"envoy.filters.http.router","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.http.router.v3.Router"}}],"internalAddressConfig":{"cidrRanges":[{"addressPrefix":"10.0.0.0","prefixLen":8},{"addressPrefix":"172.16.0.0","prefixLen":12},{"addressPrefix":"192.168.0.0","prefixLen":16},{"addressPrefix":"127.0.0.1","prefixLen":32}]},"routeConfig":{"virtual_hosts":[{"domains":["*"],"name":"health","routes":[{"match":{"prefix":"/healthz"},"name":"health","route":{"cluster":"/envoy-admin","prefixRewrite":"/ready"}}]}]},"statPrefix":"envoy-health-listener","streamIdleTimeout":"0s"}}]}],"name":"envoy-health-listener"}]}}
---
# Source: cilium/templates/hubble-relay/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hubble-relay-config
  namespace: kube-system
data:
  config.yaml: |
    cluster-name: default
    peer-service: "hubble-peer.kube-system.svc.cluster.local.:443"
    listen-address: :4245
    gops: true
    gops-port: "9893"
    metrics-listen-address: ":9966"
    retry-timeout: 
    sort-buffer-len-max: 
    sort-buffer-drain-timeout: 
    tls-hubble-client-cert-file: /var/lib/hubble-relay/tls/client.crt
    tls-hubble-client-key-file: /var/lib/hubble-relay/tls/client.key
    tls-hubble-server-ca-files: /var/lib/hubble-relay/tls/hubble-server-ca.crt
    
    disable-server-tls: true
---
# Source: cilium/templates/hubble-ui/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hubble-ui-nginx
  namespace: kube-system
data:
  nginx.conf: "server {\n    listen       8081;\n    listen       [::]:8081;\n    server_name  localhost;\n    root /app;\n    index index.html;\n    client_max_body_size 1G;\n\n    location / {\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n\n        location /api {\n            proxy_http_version 1.1;\n            proxy_pass_request_headers on;\n            proxy_pass http://127.0.0.1:8090;\n        }\n        location / {\n            # double `/index.html` is required here \n            try_files $uri $uri/ /index.html /index.html;\n        }\n\n        # Liveness probe\n        location /healthz {\n            access_log off;\n            add_header Content-Type text/plain;\n            return 200 'ok';\n        }\n    }\n}"
---
# Source: cilium/templates/cilium-agent/clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cilium
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - networking.k8s.io
  resources:
  - networkpolicies
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - namespaces
  - services
  - pods
  - endpoints
  - nodes
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - create
  - get
  - update
  - list
  - delete
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - list
  - watch
  # This is used when validating policies in preflight. This will need to stay
  # until we figure out how to avoid "get" inside the preflight, and then
  # should be removed ideally.
  - get
- apiGroups:
  - cilium.io
  resources:
  - ciliumloadbalancerippools
  - ciliumbgppeeringpolicies
  - ciliumbgpnodeconfigs
  - ciliumbgpadvertisements
  - ciliumbgppeerconfigs
  - ciliumclusterwideenvoyconfigs
  - ciliumclusterwidenetworkpolicies
  - ciliumegressgatewaypolicies
  - ciliumendpoints
  - ciliumendpointslices
  - ciliumenvoyconfigs
  - ciliumidentities
  - ciliumlocalredirectpolicies
  - ciliumnetworkpolicies
  - ciliumnodes
  - ciliumnodeconfigs
  - ciliumcidrgroups
  - ciliuml2announcementpolicies
  - ciliumpodippools
  verbs:
  - list
  - watch
- apiGroups:
  - cilium.io
  resources:
  - ciliumidentities
  - ciliumendpoints
  - ciliumnodes
  verbs:
  - create
- apiGroups:
  - cilium.io
  # To synchronize garbage collection of such resources
  resources:
  - ciliumidentities
  verbs:
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpoints
  verbs:
  - delete
  - get
- apiGroups:
  - cilium.io
  resources:
  - ciliumnodes
  - ciliumnodes/status
  verbs:
  - get
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpoints/status
  - ciliumendpoints
  - ciliuml2announcementpolicies/status
  - ciliumbgpnodeconfigs/status
  verbs:
  - patch
---
# Source: cilium/templates/cilium-operator/clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cilium-operator
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - get
  - list
  - watch
  # to automatically delete [core|kube]dns pods so that are starting to being
  # managed by Cilium
  - delete
- apiGroups:
  - ""
  resources:
  - configmaps
  resourceNames:
  - cilium-config
  verbs:
   # allow patching of the configmap to set annotations
  - patch
- apiGroups:
  - ""
  resources:
  - nodes
  verbs:
  - list
  - watch
- apiGroups:
  - ""
  resources:
  # To remove node taints
  - nodes
  # To set NetworkUnavailable false on startup
  - nodes/status
  verbs:
  - patch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  # to perform LB IP allocation for BGP
  - services/status
  verbs:
  - update
  - patch
- apiGroups:
  - ""
  resources:
  # to check apiserver connectivity
  - namespaces
  - secrets
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  # to perform the translation of a CNP that contains `ToGroup` to its endpoints
  - services
  - endpoints
  verbs:
  - get
  - list
  - watch
  - create
  - update
  - delete
  - patch
- apiGroups:
  - cilium.io
  resources:
  - ciliumnetworkpolicies
  - ciliumclusterwidenetworkpolicies
  verbs:
  # Create auto-generated CNPs and CCNPs from Policies that have 'toGroups'
  - create
  - update
  - deletecollection
  # To update the status of the CNPs and CCNPs
  - patch
  - get
  - list
  - watch
- apiGroups:
  - cilium.io
  resources:
  - ciliumnetworkpolicies/status
  - ciliumclusterwidenetworkpolicies/status
  verbs:
  # Update the auto-generated CNPs and CCNPs status.
  - patch
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpoints
  - ciliumidentities
  verbs:
  # To perform garbage collection of such resources
  - delete
  - list
  - watch
- apiGroups:
  - cilium.io
  resources:
  - ciliumidentities
  verbs:
  # To synchronize garbage collection of such resources
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumnodes
  verbs:
  - create
  - update
  - get
  - list
  - watch
    # To perform CiliumNode garbage collector
  - delete
- apiGroups:
  - cilium.io
  resources:
  - ciliumnodes/status
  verbs:
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpointslices
  - ciliumenvoyconfigs
  - ciliumbgppeerconfigs
  - ciliumbgpadvertisements
  - ciliumbgpnodeconfigs
  verbs:
  - create
  - update
  - get
  - list
  - watch
  - delete
  - patch
- apiGroups:
  - cilium.io
  resources:
  - ciliumbgpclusterconfigs/status
  - ciliumbgppeerconfigs/status
  verbs:
  - update
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - create
  - get
  - list
  - watch
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - update
  resourceNames:
  - ciliumloadbalancerippools.cilium.io
  - ciliumbgppeeringpolicies.cilium.io
  - ciliumbgpclusterconfigs.cilium.io
  - ciliumbgppeerconfigs.cilium.io
  - ciliumbgpadvertisements.cilium.io
  - ciliumbgpnodeconfigs.cilium.io
  - ciliumbgpnodeconfigoverrides.cilium.io
  - ciliumclusterwideenvoyconfigs.cilium.io
  - ciliumclusterwidenetworkpolicies.cilium.io
  - ciliumegressgatewaypolicies.cilium.io
  - ciliumendpoints.cilium.io
  - ciliumendpointslices.cilium.io
  - ciliumenvoyconfigs.cilium.io
  - ciliumexternalworkloads.cilium.io
  - ciliumidentities.cilium.io
  - ciliumlocalredirectpolicies.cilium.io
  - ciliumnetworkpolicies.cilium.io
  - ciliumnodes.cilium.io
  - ciliumnodeconfigs.cilium.io
  - ciliumcidrgroups.cilium.io
  - ciliuml2announcementpolicies.cilium.io
  - ciliumpodippools.cilium.io
- apiGroups:
  - cilium.io
  resources:
  - ciliumloadbalancerippools
  - ciliumpodippools
  - ciliumbgppeeringpolicies
  - ciliumbgpclusterconfigs
  - ciliumbgpnodeconfigoverrides
  - ciliumbgppeerconfigs
  verbs:
  - get
  - list
  - watch
- apiGroups:
    - cilium.io
  resources:
    - ciliumpodippools
  verbs:
    - create
- apiGroups:
  - cilium.io
  resources:
  - ciliumloadbalancerippools/status
  verbs:
  - patch
# For cilium-operator running in HA mode.
#
# Cilium operator running in HA mode requires the use of ResourceLock for Leader Election
# between multiple running instances.
# The preferred way of doing this is to use LeasesResourceLock as edits to Leases are less
# common and fewer objects in the cluster watch "all Leases".
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - create
  - get
  - update
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses
  - ingressclasses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses/status # To update ingress status with load balancer IP.
  verbs:
  - update
- apiGroups:
  - gateway.networking.k8s.io
  resources:
  - gatewayclasses
  - gateways
  - tlsroutes
  - httproutes
  - grpcroutes
  - referencegrants
  - referencepolicies
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - gateway.networking.k8s.io
  resources:
  - gatewayclasses/status
  - gateways/status
  - httproutes/status
  - grpcroutes/status
  - tlsroutes/status
  verbs:
  - update
  - patch
- apiGroups:
  - multicluster.x-k8s.io
  resources:
  - serviceimports
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/hubble-ui/clusterrole.yaml
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: hubble-ui
  labels:
    app.kubernetes.io/part-of: cilium

rules:
- apiGroups:
  - networking.k8s.io
  resources:
  - networkpolicies
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - componentstatuses
  - endpoints
  - namespaces
  - nodes
  - pods
  - services
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - cilium.io
  resources:
  - "*"
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cilium
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cilium
subjects:
- kind: ServiceAccount
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cilium-operator
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cilium-operator
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/hubble-ui/clusterrolebinding.yaml
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: hubble-ui
  labels:
    app.kubernetes.io/part-of: cilium

roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: hubble-ui
subjects:
- kind: ServiceAccount
  name: "hubble-ui"
  namespace: kube-system
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-config-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-ingress-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-tlsinterception-secrets
  namespace: "cilium-secrets"  
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-operator/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-operator-ingress-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - create
  - delete
  - update
  - patch
---
# Source: cilium/templates/cilium-operator/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-operator-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - create
  - delete
  - update
  - patch
---
# Source: cilium/templates/cilium-operator/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-operator-tlsinterception-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - create
  - delete
  - update
  - patch
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-config-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-config-agent
subjects:
  - kind: ServiceAccount
    name: "cilium"
    namespace: kube-system
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-ingress-secrets
subjects:
  - kind: ServiceAccount
    name: "cilium"
    namespace: kube-system
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-gateway-secrets
subjects:
- kind: ServiceAccount
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-tlsinterception-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-tlsinterception-secrets
subjects:
- kind: ServiceAccount
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-operator-ingress-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-operator-ingress-secrets
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-operator-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-operator-gateway-secrets
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-operator-tlsinterception-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-operator-tlsinterception-secrets
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-agent/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cilium-agent
  namespace: kube-system
  labels:
    k8s-app: cilium
    app.kubernetes.io/name: cilium-agent
    app.kubernetes.io/part-of: cilium
spec:
  clusterIP: None
  type: ClusterIP
  selector:
    k8s-app: cilium
  ports:
  - name: metrics
    port: 9962
    protocol: TCP
    targetPort: prometheus
---
# Source: cilium/templates/cilium-envoy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cilium-envoy
  namespace: kube-system
  labels:
    k8s-app: cilium-envoy
    app.kubernetes.io/name: cilium-envoy
    app.kubernetes.io/part-of: cilium
    io.cilium/app: proxy
spec:
  clusterIP: None
  type: ClusterIP
  selector:
    k8s-app: cilium-envoy
  ports:
  - name: envoy-metrics
    port: 9964
    protocol: TCP
    targetPort: envoy-metrics
---
# Source: cilium/templates/cilium-ingress-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cilium-ingress
  namespace: kube-system
  labels:
    cilium.io/ingress: "true"
    app.kubernetes.io/part-of: cilium
spec:
  ports:
  - name: http
    port: 80
    protocol: TCP
    nodePort: 
  - name: https
    port: 443
    protocol: TCP
    nodePort: 
  type: LoadBalancer
  externalTrafficPolicy: Cluster
---
# Source: cilium/templates/cilium-operator/service.yaml
kind: Service
apiVersion: v1
metadata:
  name: cilium-operator
  namespace: kube-system
  labels:
    io.cilium/app: operator
    name: cilium-operator
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: cilium-operator
spec:
  clusterIP: None
  type: ClusterIP
  ports:
  - name: metrics
    port: 9963
    protocol: TCP
    targetPort: prometheus
  selector:
    io.cilium/app: operator
    name: cilium-operator
---
# Source: cilium/templates/hubble-relay/metrics-service.yaml
# We use a separate service from hubble-relay which can be exposed externally
kind: Service
apiVersion: v1
metadata:
  name: hubble-relay-metrics
  namespace: kube-system
  labels:
    k8s-app: hubble-relay

spec:
  clusterIP: None
  type: ClusterIP
  selector:
    k8s-app: hubble-relay
  ports:
  - name: metrics
    port: 9966
    protocol: TCP
    targetPort: prometheus
---
# Source: cilium/templates/hubble-relay/service.yaml
kind: Service
apiVersion: v1
metadata:
  name: hubble-relay
  namespace: kube-system
  annotations:
  labels:
    k8s-app: hubble-relay
    app.kubernetes.io/name: hubble-relay
    app.kubernetes.io/part-of: cilium

spec:
  type: "ClusterIP"
  selector:
    k8s-app: hubble-relay
  ports:
  - protocol: TCP
    port: 80
    targetPort: grpc
---
# Source: cilium/templates/hubble-ui/service.yaml
kind: Service
apiVersion: v1
metadata:
  name: hubble-ui
  namespace: kube-system
  labels:
    k8s-app: hubble-ui
    app.kubernetes.io/name: hubble-ui
    app.kubernetes.io/part-of: cilium

spec:
  type: "ClusterIP"
  selector:
    k8s-app: hubble-ui
  ports:
    - name: http
      port: 80
      targetPort: 8081
---
# Source: cilium/templates/hubble/metrics-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hubble-metrics
  namespace: kube-system
  labels:
    k8s-app: hubble
    app.kubernetes.io/name: hubble
    app.kubernetes.io/part-of: cilium

  annotations:
spec:
  clusterIP: None
  type: ClusterIP
  ports:
  - name: hubble-metrics
    port: 9965
    protocol: TCP
    targetPort: hubble-metrics
  selector:
    k8s-app: cilium
---
# Source: cilium/templates/hubble/peer-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hubble-peer
  namespace: kube-system
  labels:
    k8s-app: cilium
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: hubble-peer

spec:
  selector:
    k8s-app: cilium
  ports:
  - name: peer-service
    port: 443
    protocol: TCP
    targetPort: 4244
  internalTrafficPolicy: Local
---
# Source: cilium/templates/cilium-agent/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cilium
  namespace: kube-system
  labels:
    k8s-app: cilium
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: cilium-agent
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 2
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/cilium-configmap-checksum: "5829d8094e295aa0d2c167c03d78487eb3abe167905b77b2f89add5cad19497a"
      labels:
        k8s-app: cilium
        app.kubernetes.io/name: cilium-agent
        app.kubernetes.io/part-of: cilium
    spec:
      securityContext:
        appArmorProfile:
          type: Unconfined
      containers:
      - name: cilium-agent
        image: "quay.io/cilium/cilium:v1.17.5@sha256:baf8541723ee0b72d6c489c741c81a6fdc5228940d66cb76ef5ea2ce3c639ea6"
        imagePullPolicy: IfNotPresent
        command:
        - cilium-agent
        args:
        - --config-dir=/tmp/cilium/config-map
        startupProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: "brief"
              value: "true"
          failureThreshold: 105
          periodSeconds: 2
          successThreshold: 1
          initialDelaySeconds: 5
        livenessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: "brief"
              value: "true"
            - name: "require-k8s-connectivity"
              value: "false"
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 10
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: "brief"
              value: "true"
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 3
          timeoutSeconds: 5
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: CILIUM_CLUSTERMESH_CONFIG
          value: /var/lib/cilium/clustermesh/
        - name: GOMEMLIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.memory
              divisor: '1'
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        lifecycle:
          postStart:
            exec:
              command:
              - "bash"
              - "-c"
              - |
                    set -o errexit
                    set -o pipefail
                    set -o nounset
                    
                    # When running in AWS ENI mode, it's likely that 'aws-node' has
                    # had a chance to install SNAT iptables rules. These can result
                    # in dropped traffic, so we should attempt to remove them.
                    # We do it using a 'postStart' hook since this may need to run
                    # for nodes which might have already been init'ed but may still
                    # have dangling rules. This is safe because there are no
                    # dependencies on anything that is part of the startup script
                    # itself, and can be safely run multiple times per node (e.g. in
                    # case of a restart).
                    if [[ "$(iptables-save | grep -E -c 'AWS-SNAT-CHAIN|AWS-CONNMARK-CHAIN')" != "0" ]];
                    then
                        echo 'Deleting iptables rules created by the AWS CNI VPC plugin'
                        iptables-save | grep -E -v 'AWS-SNAT-CHAIN|AWS-CONNMARK-CHAIN' | iptables-restore
                    fi
                    echo 'Done!'
                    
          preStop:
            exec:
              command:
              - /cni-uninstall.sh
        ports:
        - name: peer-service
          containerPort: 4244
          hostPort: 4244
          protocol: TCP
        - name: prometheus
          containerPort: 9962
          hostPort: 9962
          protocol: TCP
        - name: hubble-metrics
          containerPort: 9965
          hostPort: 9965
          protocol: TCP
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - CHOWN
              - KILL
              - NET_ADMIN
              - NET_RAW
              - IPC_LOCK
              - SYS_MODULE
              - SYS_ADMIN
              - SYS_RESOURCE
              - DAC_OVERRIDE
              - FOWNER
              - SETGID
              - SETUID
            drop:
              - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
        - name: envoy-sockets
          mountPath: /var/run/cilium/envoy/sockets
          readOnly: false
        # Unprivileged containers need to mount /proc/sys/net from the host
        # to have write access
        - mountPath: /host/proc/sys/net
          name: host-proc-sys-net
        # Unprivileged containers need to mount /proc/sys/kernel from the host
        # to have write access
        - mountPath: /host/proc/sys/kernel
          name: host-proc-sys-kernel
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          # Unprivileged containers can't set mount propagation to bidirectional
          # in this case we will mount the bpf fs from an init container that
          # is privileged and set the mount propagation from host to container
          # in Cilium.
          mountPropagation: HostToContainer
        - name: cilium-run
          mountPath: /var/run/cilium
        - name: cilium-netns
          mountPath: /var/run/cilium/netns
          mountPropagation: HostToContainer
        - name: etc-cni-netd
          mountPath: /host/etc/cni/net.d
        - name: clustermesh-secrets
          mountPath: /var/lib/cilium/clustermesh
          readOnly: true
        - name: ip-masq-agent
          mountPath: /etc/config
          readOnly: true
          # Needed to be able to load kernel modules
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        - name: xtables-lock
          mountPath: /run/xtables.lock
        - name: cilium-ipsec-secrets
          mountPath: /etc/ipsec
        - name: hubble-tls
          mountPath: /var/lib/cilium/tls/hubble
          readOnly: true
        - name: tmp
          mountPath: /tmp
      initContainers:
      - name: config
        image: "quay.io/cilium/cilium:v1.17.5@sha256:baf8541723ee0b72d6c489c741c81a6fdc5228940d66cb76ef5ea2ce3c639ea6"
        imagePullPolicy: IfNotPresent
        command:
        - cilium-dbg
        - build-config
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        terminationMessagePolicy: FallbackToLogsOnError
      # Required to mount cgroup2 filesystem on the underlying Kubernetes node.
      # We use nsenter command with host's cgroup and mount namespaces enabled.
      - name: mount-cgroup
        image: "quay.io/cilium/cilium:v1.17.5@sha256:baf8541723ee0b72d6c489c741c81a6fdc5228940d66cb76ef5ea2ce3c639ea6"
        imagePullPolicy: IfNotPresent
        env:
        - name: CGROUP_ROOT
          value: /run/cilium/cgroupv2
        - name: BIN_PATH
          value: /opt/cni/bin
        command:
        - sh
        - -ec
        # The statically linked Go program binary is invoked to avoid any
        # dependency on utilities like sh and mount that can be missing on certain
        # distros installed on the underlying host. Copy the binary to the
        # same directory where we install cilium cni plugin so that exec permissions
        # are available.
        - |
          cp /usr/bin/cilium-mount /hostbin/cilium-mount;
          nsenter --cgroup=/hostproc/1/ns/cgroup --mount=/hostproc/1/ns/mnt "${BIN_PATH}/cilium-mount" $CGROUP_ROOT;
          rm /hostbin/cilium-mount
        volumeMounts:
        - name: hostproc
          mountPath: /hostproc
        - name: cni-path
          mountPath: /hostbin
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - SYS_ADMIN
              - SYS_CHROOT
              - SYS_PTRACE
            drop:
              - ALL
      - name: apply-sysctl-overwrites
        image: "quay.io/cilium/cilium:v1.17.5@sha256:baf8541723ee0b72d6c489c741c81a6fdc5228940d66cb76ef5ea2ce3c639ea6"
        imagePullPolicy: IfNotPresent
        env:
        - name: BIN_PATH
          value: /opt/cni/bin
        command:
        - sh
        - -ec
        # The statically linked Go program binary is invoked to avoid any
        # dependency on utilities like sh that can be missing on certain
        # distros installed on the underlying host. Copy the binary to the
        # same directory where we install cilium cni plugin so that exec permissions
        # are available.
        - |
          cp /usr/bin/cilium-sysctlfix /hostbin/cilium-sysctlfix;
          nsenter --mount=/hostproc/1/ns/mnt "${BIN_PATH}/cilium-sysctlfix";
          rm /hostbin/cilium-sysctlfix
        volumeMounts:
        - name: hostproc
          mountPath: /hostproc
        - name: cni-path
          mountPath: /hostbin
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - SYS_ADMIN
              - SYS_CHROOT
              - SYS_PTRACE
            drop:
              - ALL
      # Mount the bpf fs if it is not mounted. We will perform this task
      # from a privileged container because the mount propagation bidirectional
      # only works from privileged containers.
      - name: mount-bpf-fs
        image: "quay.io/cilium/cilium:v1.17.5@sha256:baf8541723ee0b72d6c489c741c81a6fdc5228940d66cb76ef5ea2ce3c639ea6"
        imagePullPolicy: IfNotPresent
        args:
        - 'mount | grep "/sys/fs/bpf type bpf" || mount -t bpf bpf /sys/fs/bpf'
        command:
        - /bin/bash
        - -c
        - --
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          privileged: true
        volumeMounts:
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          mountPropagation: Bidirectional
      - name: clean-cilium-state
        image: "quay.io/cilium/cilium:v1.17.5@sha256:baf8541723ee0b72d6c489c741c81a6fdc5228940d66cb76ef5ea2ce3c639ea6"
        imagePullPolicy: IfNotPresent
        command:
        - /init-container.sh
        env:
        - name: CILIUM_ALL_STATE
          valueFrom:
            configMapKeyRef:
              name: cilium-config
              key: clean-cilium-state
              optional: true
        - name: CILIUM_BPF_STATE
          valueFrom:
            configMapKeyRef:
              name: cilium-config
              key: clean-cilium-bpf-state
              optional: true
        - name: WRITE_CNI_CONF_WHEN_READY
          valueFrom:
            configMapKeyRef:
              name: cilium-config
              key: write-cni-conf-when-ready
              optional: true
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - NET_ADMIN
              - SYS_MODULE
              - SYS_ADMIN
              - SYS_RESOURCE
            drop:
              - ALL
        volumeMounts:
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          # Required to mount cgroup filesystem from the host to cilium agent pod
        - name: cilium-cgroup
          mountPath: /run/cilium/cgroupv2
          mountPropagation: HostToContainer
        - name: cilium-run
          mountPath: /var/run/cilium # wait-for-kube-proxy
      # Install the CNI binaries in an InitContainer so we don't have a writable host mount in the agent
      - name: install-cni-binaries
        image: "quay.io/cilium/cilium:v1.17.5@sha256:baf8541723ee0b72d6c489c741c81a6fdc5228940d66cb76ef5ea2ce3c639ea6"
        imagePullPolicy: IfNotPresent
        command:
          - "/install-plugin.sh"
        resources:
          requests:
            cpu: 100m
            memory: 10Mi
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            drop:
              - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
          - name: cni-path
            mountPath: /host/opt/cni/bin # .Values.cni.install
      restartPolicy: Always
      priorityClassName: system-node-critical
      serviceAccountName: "cilium"
      automountServiceAccountToken: true
      terminationGracePeriodSeconds: 1
      hostNetwork: true
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - operator: Exists
      volumes:
        # For sharing configuration between the "config" initContainer and the agent
      - name: tmp
        emptyDir: {}
        # To keep state between restarts / upgrades
      - name: cilium-run
        hostPath:
          path: /var/run/cilium
          type: DirectoryOrCreate
        # To exec into pod network namespaces
      - name: cilium-netns
        hostPath:
          path: /var/run/netns
          type: DirectoryOrCreate
        # To keep state between restarts / upgrades for bpf maps
      - name: bpf-maps
        hostPath:
          path: /sys/fs/bpf
          type: DirectoryOrCreate
      # To mount cgroup2 filesystem on the host or apply sysctlfix
      - name: hostproc
        hostPath:
          path: /proc
          type: Directory
      # To keep state between restarts / upgrades for cgroup2 filesystem
      - name: cilium-cgroup
        hostPath:
          path: /run/cilium/cgroupv2
          type: DirectoryOrCreate
      # To install cilium cni plugin in the host
      - name: cni-path
        hostPath:
          path:  /opt/cni/bin
          type: DirectoryOrCreate
        # To install cilium cni configuration in the host
      - name: etc-cni-netd
        hostPath:
          path: /etc/cni/net.d
          type: DirectoryOrCreate
        # To be able to load kernel modules
      - name: lib-modules
        hostPath:
          path: /lib/modules
        # To access iptables concurrently with other processes (e.g. kube-proxy)
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      # Sharing socket with Cilium Envoy on the same node by using a host path
      - name: envoy-sockets
        hostPath:
          path: "/var/run/cilium/envoy/sockets"
          type: DirectoryOrCreate
        # To read the clustermesh configuration
      - name: clustermesh-secrets
        projected:
          # note: the leading zero means this number is in octal representation: do not remove it
          defaultMode: 0400
          sources:
          - secret:
              name: cilium-clustermesh
              optional: true
              # note: items are not explicitly listed here, since the entries of this secret
              # depend on the peers configured, and that would cause a restart of all agents
              # at every addition/removal. Leaving the field empty makes each secret entry
              # to be automatically projected into the volume as a file whose name is the key.
          - secret:
              name: clustermesh-apiserver-remote-cert
              optional: true
              items:
              - key: tls.key
                path: common-etcd-client.key
              - key: tls.crt
                path: common-etcd-client.crt
              - key: ca.crt
                path: common-etcd-client-ca.crt
          # note: we configure the volume for the kvstoremesh-specific certificate
          # regardless of whether KVStoreMesh is enabled or not, so that it can be
          # automatically mounted in case KVStoreMesh gets subsequently enabled,
          # without requiring an agent restart.
          - secret:
              name: clustermesh-apiserver-local-cert
              optional: true
              items:
              - key: tls.key
                path: local-etcd-client.key
              - key: tls.crt
                path: local-etcd-client.crt
              - key: ca.crt
                path: local-etcd-client-ca.crt
      - name: ip-masq-agent
        configMap:
          name: ip-masq-agent
          optional: true
          items:
          - key: config
            path: ip-masq-agent
      - name: cilium-ipsec-secrets
        secret:
          secretName: cilium-ipsec-keys
      - name: host-proc-sys-net
        hostPath:
          path: /proc/sys/net
          type: Directory
      - name: host-proc-sys-kernel
        hostPath:
          path: /proc/sys/kernel
          type: Directory
      - name: hubble-tls
        projected:
          # note: the leading zero means this number is in octal representation: do not remove it
          defaultMode: 0400
          sources:
          - secret:
              name: hubble-server-certs
              optional: true
              items:
              - key: tls.crt
                path: server.crt
              - key: tls.key
                path: server.key
              - key: ca.crt
                path: client-ca.crt
---
# Source: cilium/templates/cilium-envoy/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cilium-envoy
  namespace: kube-system
  labels:
    k8s-app: cilium-envoy
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: cilium-envoy
    name: cilium-envoy
spec:
  selector:
    matchLabels:
      k8s-app: cilium-envoy
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 2
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/cilium-envoy-configmap-checksum: "93ea335eabe243968f498f059c70367529a6a0153e78e4458c312c6304bde14c"
      labels:
        k8s-app: cilium-envoy
        name: cilium-envoy
        app.kubernetes.io/name: cilium-envoy
        app.kubernetes.io/part-of: cilium
    spec:
      securityContext:
        appArmorProfile:
          type: Unconfined
      containers:
      - name: cilium-envoy
        image: "quay.io/cilium/cilium-envoy:v1.32.6-1749271279-0864395884b263913eac200ee2048fd985f8e626@sha256:9f69e290a7ea3d4edf9192acd81694089af048ae0d8a67fb63bd62dc1d72203e"
        imagePullPolicy: IfNotPresent
        command:
        - /usr/bin/cilium-envoy-starter
        args:
        - '--keep-cap-net-bind-service'
        - '--'
        - '-c /var/run/cilium/envoy/bootstrap-config.json'
        - '--base-id 0'
        - '--log-level info'
        startupProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9878
            scheme: HTTP
          failureThreshold: 105
          periodSeconds: 2
          successThreshold: 1
          initialDelaySeconds: 5
        livenessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9878
            scheme: HTTP
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 10
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9878
            scheme: HTTP
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 3
          timeoutSeconds: 5
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        ports:
        - name: envoy-metrics
          containerPort: 9964
          hostPort: 9964
          protocol: TCP
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - NET_ADMIN
              - SYS_ADMIN
            drop:
              - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
        - name: envoy-sockets
          mountPath: /var/run/cilium/envoy/sockets
          readOnly: false
        - name: envoy-artifacts
          mountPath: /var/run/cilium/envoy/artifacts
          readOnly: true
        - name: envoy-config
          mountPath: /var/run/cilium/envoy/
          readOnly: true
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          mountPropagation: HostToContainer
      restartPolicy: Always
      priorityClassName: system-node-critical
      serviceAccountName: "cilium-envoy"
      automountServiceAccountToken: true
      terminationGracePeriodSeconds: 1
      hostNetwork: true
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: cilium.io/no-schedule
                operator: NotIn
                values:
                - "true"
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium
            topologyKey: kubernetes.io/hostname
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium-envoy
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - operator: Exists
      volumes:
      - name: envoy-sockets
        hostPath:
          path: "/var/run/cilium/envoy/sockets"
          type: DirectoryOrCreate
      - name: envoy-artifacts
        hostPath:
          path: "/var/run/cilium/envoy/artifacts"
          type: DirectoryOrCreate
      - name: envoy-config
        configMap:
          name: "cilium-envoy-config"
          # note: the leading zero means this number is in octal representation: do not remove it
          defaultMode: 0400
          items:
            - key: bootstrap-config.json
              path: bootstrap-config.json
        # To keep state between restarts / upgrades
        # To keep state between restarts / upgrades for bpf maps
      - name: bpf-maps
        hostPath:
          path: /sys/fs/bpf
          type: DirectoryOrCreate
---
# Source: cilium/templates/cilium-operator/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cilium-operator
  namespace: kube-system
  labels:
    io.cilium/app: operator
    name: cilium-operator
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: cilium-operator
spec:
  # See docs on ServerCapabilities.LeasesResourceLock in file pkg/k8s/version/version.go
  # for more details.
  replicas: 1
  selector:
    matchLabels:
      io.cilium/app: operator
      name: cilium-operator
  # ensure operator update on single node k8s clusters, by using rolling update with maxUnavailable=100% in case
  # of one replica and no user configured Recreate strategy.
  # otherwise an update might get stuck due to the default maxUnavailable=50% in combination with the
  # podAntiAffinity which prevents deployments of multiple operator replicas on the same node.
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 100%
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/cilium-configmap-checksum: "5829d8094e295aa0d2c167c03d78487eb3abe167905b77b2f89add5cad19497a"
      labels:
        io.cilium/app: operator
        name: cilium-operator
        app.kubernetes.io/part-of: cilium
        app.kubernetes.io/name: cilium-operator
    spec:
      containers:
      - name: cilium-operator
        image: "quay.io/cilium/operator-generic:v1.17.5@sha256:f954c97eeb1b47ed67d08cc8fb4108fb829f869373cbb3e698a7f8ef1085b09e"
        imagePullPolicy: IfNotPresent
        command:
        - cilium-operator-generic
        args:
        - --config-dir=/tmp/cilium/config-map
        - --debug=$(CILIUM_DEBUG)
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: CILIUM_DEBUG
          valueFrom:
            configMapKeyRef:
              key: debug
              name: cilium-config
              optional: true
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        ports:
        - name: prometheus
          containerPort: 9963
          hostPort: 9963
          protocol: TCP
        livenessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9234
            scheme: HTTP
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 3
        readinessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9234
            scheme: HTTP
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 5
        volumeMounts:
        - name: cilium-config-path
          mountPath: /tmp/cilium/config-map
          readOnly: true
        terminationMessagePolicy: FallbackToLogsOnError
      hostNetwork: true
      restartPolicy: Always
      priorityClassName: system-cluster-critical
      serviceAccountName: "cilium-operator"
      automountServiceAccountToken: true
      # In HA mode, cilium-operator pods must not be scheduled on the same
      # node as they will clash with each other.
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                io.cilium/app: operator
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - operator: Exists
      volumes:
        # To read the configuration from the config map
      - name: cilium-config-path
        configMap:
          name: cilium-config
---
# Source: cilium/templates/hubble-relay/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hubble-relay
  namespace: kube-system
  labels:
    k8s-app: hubble-relay
    app.kubernetes.io/name: hubble-relay
    app.kubernetes.io/part-of: cilium

spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: hubble-relay
  strategy:
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/hubble-relay-configmap-checksum: "da07254ba8b05a70e1fd8a27fbe5298b360205947f3bf3c53f58cfc7cc74159e"
      labels:
        k8s-app: hubble-relay
        app.kubernetes.io/name: hubble-relay
        app.kubernetes.io/part-of: cilium
    spec:
      securityContext:
        fsGroup: 65532
      containers:
        - name: hubble-relay
          securityContext:
            capabilities:
              drop:
              - ALL
            runAsGroup: 65532
            runAsNonRoot: true
            runAsUser: 65532
          image: "quay.io/cilium/hubble-relay:v1.17.5@sha256:fbb8a6afa8718200fca9381ad274ed695792dbadd2417b0e99c36210ae4964ff"
          imagePullPolicy: IfNotPresent
          command:
            - hubble-relay
          args:
            - serve
          ports:
            - name: grpc
              containerPort: 4245
            - name: prometheus
              containerPort: 9966
              protocol: TCP
          readinessProbe:
            grpc:
              port: 4222
            timeoutSeconds: 3
          # livenessProbe will kill the pod, we should be very conservative
          # here on failures since killing the pod should be a last resort, and
          # we should provide enough time for relay to retry before killing it.
          livenessProbe:
            grpc:
              port: 4222
            timeoutSeconds: 10
            # Give relay time to establish connections and make a few retries
            # before starting livenessProbes.
            initialDelaySeconds: 10
            # 10 second * 12 failures = 2 minutes of failure.
            # If relay cannot become healthy after 2 minutes, then killing it
            # might resolve whatever issue is occurring.
            #
            # 10 seconds is a reasonable retry period so we can see if it's
            # failing regularly or only sporadically.
            periodSeconds: 10
            failureThreshold: 12
          startupProbe:
            grpc:
              port: 4222
            # Give relay time to get it's certs and establish connections and
            # make a few retries before starting startupProbes.
            initialDelaySeconds: 10
            # 20 * 3 seconds = 1 minute of failure before we consider startup as failed.
            failureThreshold: 20
            # Retry more frequently at startup so that it can be considered started more quickly.
            periodSeconds: 3
          volumeMounts:
          - name: config
            mountPath: /etc/hubble-relay
            readOnly: true
          - name: tls
            mountPath: /var/lib/hubble-relay/tls
            readOnly: true
          terminationMessagePolicy: FallbackToLogsOnError
        
      restartPolicy: Always
      priorityClassName: 
      serviceAccountName: "hubble-relay"
      automountServiceAccountToken: false
      terminationGracePeriodSeconds: 1
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/os: linux
        node-role.kubernetes.io/infra: ""
      tolerations:
        - key: CriticalAddonsOnly
          operator: Exists
        - effect: NoSchedule
          key: node-role.kubernetes.io/bootstrap
          operator: Exists
        - effect: NoSchedule
          key: node-role.kubernetes.io/infra
          operator: Exists
      volumes:
      - name: config
        configMap:
          name: hubble-relay-config
          items:
          - key: config.yaml
            path: config.yaml
      - name: tls
        projected:
          # note: the leading zero means this number is in octal representation: do not remove it
          defaultMode: 0400
          sources:
          - secret:
              name: hubble-relay-client-certs
              items:
                - key: tls.crt
                  path: client.crt
                - key: tls.key
                  path: client.key
                - key: ca.crt
                  path: hubble-server-ca.crt
---
# Source: cilium/templates/hubble-ui/deployment.yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: hubble-ui
  namespace: kube-system
  labels:
    k8s-app: hubble-ui
    app.kubernetes.io/name: hubble-ui
    app.kubernetes.io/part-of: cilium
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: hubble-ui
  strategy:
    rollingUpdate:
      maxUnavailable: 1
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/hubble-ui-nginx-configmap-checksum: "de069d2597e16e4de004ce684b15d74b2ab6051c717ae073d86199a76d91fcf1"
      labels:
        k8s-app: hubble-ui
        app.kubernetes.io/name: hubble-ui
        app.kubernetes.io/part-of: cilium
    spec:
      securityContext:
        fsGroup: 1001
        runAsGroup: 1001
        runAsUser: 1001
      priorityClassName: 
      serviceAccountName: "hubble-ui"
      automountServiceAccountToken: true
      containers:
      - name: frontend
        image: "quay.io/cilium/hubble-ui:v0.13.2@sha256:9e37c1296b802830834cc87342a9182ccbb71ffebb711971e849221bd9d59392"
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 8081
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
        readinessProbe:
          httpGet:
            path: /
            port: 8081
        volumeMounts:
        - name: hubble-ui-nginx-conf
          mountPath: /etc/nginx/conf.d/default.conf
          subPath: nginx.conf
        - name: tmp-dir
          mountPath: /tmp
        terminationMessagePolicy: FallbackToLogsOnError
      - name: backend
        image: "quay.io/cilium/hubble-ui-backend:v0.13.2@sha256:a034b7e98e6ea796ed26df8f4e71f83fc16465a19d166eff67a03b822c0bfa15"
        imagePullPolicy: IfNotPresent
        env:
        - name: EVENTS_SERVER_PORT
          value: "8090"
        - name: FLOWS_API_ADDR
          value: "hubble-relay:80"
        ports:
        - name: grpc
          containerPort: 8090
        volumeMounts:
        terminationMessagePolicy: FallbackToLogsOnError
      nodeSelector:
        kubernetes.io/os: linux
        node-role.kubernetes.io/infra: ""
      tolerations:
        - key: CriticalAddonsOnly
          operator: Exists
        - effect: NoSchedule
          key: node-role.kubernetes.io/bootstrap
          operator: Exists
        - effect: NoSchedule
          key: node-role.kubernetes.io/infra
          operator: Exists
      volumes:
      - configMap:
          defaultMode: 420
          name: hubble-ui-nginx
        name: hubble-ui-nginx-conf
      - emptyDir: {}
        name: tmp-dir
---
# Source: cilium/templates/cilium-ingress-class.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: cilium
spec:
  controller: cilium.io/ingress-controller
---
# Source: cilium/templates/hubble-ui/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hubble-ui
  namespace: kube-system
  labels:
    k8s-app: hubble-ui
    app.kubernetes.io/name: hubble-ui
    app.kubernetes.io/part-of: cilium
spec:
  ingressClassName: cilium
  rules:
    - host: hubble.localhost
      http:
        paths:
          - path: "/"
            pathType: Prefix
            backend:
              service:
                name: hubble-ui
                port:
                  name: http
---
# Source: cilium/templates/cilium-ingress-service.yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: cilium-ingress
  namespace: kube-system
subsets:
- addresses:
  - ip: "192.192.192.192"
  ports:
  - port: 9999
