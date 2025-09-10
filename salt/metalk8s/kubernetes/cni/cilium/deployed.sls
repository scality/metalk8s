#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

# What's below is based on the helm deployment provided by Cilium repository.
# export API_SERVER_IP=127.0.0.1
# export API_SERVER_PORT=7443
# helm template cilium/cilium --version 1.17.7 \
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
#   --set "ipMasqAgent.config.nonMasqueradeCIDRs=[]" \
#   --set gatewayAPI.enabled=true \

# Manual modifications
#
# A- Delete securityContext section from cilium daemonset
#---
#securityContext:
#  appArmorProfile:
#    type: Unconfined
#
# B- Replace appArmorProfile by seccompProfile in securityContext section
# from cilium-envoy daemonset
#---
#securityContext:
#  appArmorProfile:
#    type: Unconfined
#
# C- Delete Endpoint deployment empty labels section
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
# Source: cilium/templates/cilium-ca-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cilium-ca
  namespace: kube-system
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURFekNDQWZ1Z0F3SUJBZ0lRVWZtRjYxaUVvS3dubXdpc1RuTmlFREFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3T1RBNU1UVXpOVE01V2hjTk1qZ3dPVEE0TVRVegpOVE01V2pBVU1SSXdFQVlEVlFRREV3bERhV3hwZFcwZ1EwRXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRQ29La0FaTHNjT095bklFVUNnU2hXZFZ4K3JMOGZIY1IvbERkQXBDTXFVTmtzRHVHVXgKQ21OQko2Vi92SmlIR1VteDJ2QVBLUXI4WVJ3YjFCckNJUXF2SWRPNzVBaFZPS1gwblhmMXNPZ082MDFaNGFNTQp4NnVVUTVUOVJwdTBKK0cybk8rYS9tZ2pEOHBSQjBqL0V5NjFySHprNGN2OFZFWXhCZGJsNmZSYUtOc01YY0M2CnFtL2hOaGdpVHNhSitsZ1ZKZTcyN0hIRlp5SmZaQkVSQ1VYVCtESzJiV3VoL01rRWVNQVcxWkEvS0ppVCtLdlYKL3k2TjJWeFJRbWYyQWRkeE84L0FhUWFlS3RUZkJGdG54eUNEYWdGRUozUGo2UTdYdW94OW1GZDVqNFBheUdLcQpYcExXa0traDlyZmdiU2pkcXJuNURjRElraW9YT3BuWWNqZU5BZ01CQUFHallUQmZNQTRHQTFVZER3RUIvd1FFCkF3SUNwREFkQmdOVkhTVUVGakFVQmdnckJnRUZCUWNEQVFZSUt3WUJCUVVIQXdJd0R3WURWUjBUQVFIL0JBVXcKQXdFQi96QWRCZ05WSFE0RUZnUVVmeUg3a0w2K2tqWnlGSW9YS2xSakxGa00wRXd3RFFZSktvWklodmNOQVFFTApCUUFEZ2dFQkFFOU1nQ252WGdFUjdNRiswRUxZbkd1NnAwc1huZHk5WEQ4dEhPQkxROTUvZUE2Q2RRZ1h3WlB5CnVOT0F5U2dEaFRLdmJXNkNXcndwR2xDK1V3RlZBeWlOS25RY05JalhyK1I2bUJVRzRGUTZNM1YzYnpvbjJvUU0KNGxkSVpEZ0hwNThiekYrN1hYVlZWR3NTbkxKaGVGcUExcjNKWFNLV2ZydHo2VkVjSjR3d21wOXhqOC94ZDllYwpHeFNJeStaWngxZlIvWDFWVnpEVVkraVpCZS9mMVVFc2JxZWFUREh0ZThSYjBjZi9QQ1NCTFZDWnpSMjdwWE1YCmFUWElXWXlyMHVLcCtBZHRKOHhkV1FidzlGSkNNYjBEMStKdms2ck1VOUZRUHNCOXNzUjRwYWEvVXRLUm1YRlEKUnRnSmVkZUNIV1p6L3RnVm9EUXFEZnU1cW1wdzFSdz0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  ca.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb2dJQkFBS0NBUUVBcUNwQUdTN0hEanNweUJGQW9Fb1ZuVmNmcXkvSHgzRWY1UTNRS1FqS2xEWkxBN2hsCk1RcGpRU2VsZjd5WWh4bEpzZHJ3RHlrSy9HRWNHOVFhd2lFS3J5SFR1K1FJVlRpbDlKMTM5YkRvRHV0TldlR2oKRE1lcmxFT1UvVWFidENmaHRwenZtdjVvSXcvS1VRZEkveE11dGF4ODVPSEwvRlJHTVFYVzVlbjBXaWpiREYzQQp1cXB2NFRZWUlrN0dpZnBZRlNYdTl1eHh4V2NpWDJRUkVRbEYwL2d5dG0xcm9mekpCSGpBRnRXUVB5aVlrL2lyCjFmOHVqZGxjVVVKbjlnSFhjVHZQd0drR25pclUzd1JiWjhjZ2cyb0JSQ2R6NCtrTzE3cU1mWmhYZVkrRDJzaGkKcWw2UzFwQ3BJZmEzNEcwbzNhcTUrUTNBeUpJcUZ6cVoySEkzalFJREFRQUJBb0lCQUFNL25iRmUxL1dNYXdnMApYUjA3a1NOUzlZZW5DcUx0cW9JUVBEOHVya3NpcVZ4UENaVmk3L3ZvT2lnM2luTEJxRXpKUCszckN3MUpDdlAyCnF2V3BFYjNFVjRTL3FQR01nSmd6R29naWZMa2REb2QzOW1CZTB3K3dKb2FtQUlnQVpUblQya1VTT1F6RVYxSXQKWTltWmswTnJLNVo0VGlwM3JrdHdJM0Naam1EWGRTejFSNmFoVjVZeGhqbWxNZFFoTTkxamhSQ0t2UXpUNGU5LwpsTzNyMVE5V3NqOUwwK1Z1c0d6S3loMW5TVk9uWjBRL1M3OWF1ZExPcURsdEtHVGFuNThJRlByQ25uemdWU2Q2CnZLOXdmeTJYRm52bUZxZk1NWmVSTHJqRThVWlY2VGpqR0hROWNMdzdwdENUY0xnQU1ORXNtNHJaMzVLb3QyR2wKVHNENVY3a0NnWUVBMmwreFFTOE9uMTdpUVhQbTNCOENleTd1RTkzM0J1b1gxc05CZ3ZqZDk5ZDJOc2g2dkJ3Ygo4Z2dZZUg1K0N0bU1lMEVQRmpBQWtRVW5RNXJHaXFVOEJaOEc5Qm4zenZORjhpN0NoSDdVbFVhcHVGTWFPSDNMCkNKMEhMSnN5ZDNhVTdYMzk1OTFkRlVsa3hFejlhekVkT242YTVweXJXQVpQZkw0cGZQeE9qMGNDZ1lFQXhTUGkKK09QNkFGTXdrYkZhclJVRm5Va0ZuWnpYS3d1bTVxRVY3bktiSWFyZEVDYjAzdjE0SDN1R0hLL3JaSExPNHNETgpScWVFUGNld1JTNjQrQUZNelFtc0tTRVFUdEpjbHJIbG1QOWJLaWg1NW5lYjRhUFNoVVJBRGpOWnU4SnZqaHpUCjZpYlBKUXg4a1JIOWZJVVJmQXhGZUJJV3NrR1lhQjVKUHkzUU5Jc0NnWUJSWTUwQytIRHd3VUordHAzeXFMUWEKQ1ZHK29kbngvOG5HeDV0aEh6UkxyVWhuL3F5UDg4SU9vU25OcndkM0w4SUdKaWRqVTV6Q2NETkVKU21lZnhzeAoxU1dZVVIxbFNwSmxRenhJZWFUdHhocDNrckdSSUlGTndvanIvU1FBRm5oSFU5QVFYUmJXV2padVcydVFTZ3ZrCncwOGthSHdNSUwzN2RqeXNVclZNL1FLQmdDaFdtWURZRlRXdjBBWmZ4ZkFZbHhlQjg1WTJtNGlCVDl0dEpyR3QKM2JSYjQvUUVKS0xrTm9vcW1seVFXcGdwTGRBVUoyekhwaldHQUxtSFArM3ZSaW5HU3VYM2tBQ3c1cVVuTFpYSwoybnFiNGFXWTM5cWh6TmZjQ1VkZWxvUG0yekMzRVYyZUoxQ3JaMm0veHFDT0VlL1NDdnp3cHBnKzk5S0dML0t2Cml5VFZBb0dBSXpVY2ZBWVZ5ak1SbVpqQUpOR3VHUmwwLzVxRHhjaTFzTU9uZEp5bHg5QVZ2eXd3c05BdTlSZ3UKVjJYNC9GSXpLbDUrU3E5cUo1R3Vjc2Z1b3d0ODhSa3g3KzhPWjczMTczQjBMQUV0T3JWblJFRnBIMXppNk5yQgprc0ZIeGR2SUNpK1hvWEJ4V00vQm9ua3lDdE5ZTW5RcmR6UmhwYXZCbUZJN0ptQjZJS2c9Ci0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
---
# Source: cilium/templates/hubble/tls-helm/server-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: hubble-server-certs
  namespace: kube-system
type: kubernetes.io/tls
data:
  ca.crt:  LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURFekNDQWZ1Z0F3SUJBZ0lRVWZtRjYxaUVvS3dubXdpc1RuTmlFREFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3T1RBNU1UVXpOVE01V2hjTk1qZ3dPVEE0TVRVegpOVE01V2pBVU1SSXdFQVlEVlFRREV3bERhV3hwZFcwZ1EwRXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRQ29La0FaTHNjT095bklFVUNnU2hXZFZ4K3JMOGZIY1IvbERkQXBDTXFVTmtzRHVHVXgKQ21OQko2Vi92SmlIR1VteDJ2QVBLUXI4WVJ3YjFCckNJUXF2SWRPNzVBaFZPS1gwblhmMXNPZ082MDFaNGFNTQp4NnVVUTVUOVJwdTBKK0cybk8rYS9tZ2pEOHBSQjBqL0V5NjFySHprNGN2OFZFWXhCZGJsNmZSYUtOc01YY0M2CnFtL2hOaGdpVHNhSitsZ1ZKZTcyN0hIRlp5SmZaQkVSQ1VYVCtESzJiV3VoL01rRWVNQVcxWkEvS0ppVCtLdlYKL3k2TjJWeFJRbWYyQWRkeE84L0FhUWFlS3RUZkJGdG54eUNEYWdGRUozUGo2UTdYdW94OW1GZDVqNFBheUdLcQpYcExXa0traDlyZmdiU2pkcXJuNURjRElraW9YT3BuWWNqZU5BZ01CQUFHallUQmZNQTRHQTFVZER3RUIvd1FFCkF3SUNwREFkQmdOVkhTVUVGakFVQmdnckJnRUZCUWNEQVFZSUt3WUJCUVVIQXdJd0R3WURWUjBUQVFIL0JBVXcKQXdFQi96QWRCZ05WSFE0RUZnUVVmeUg3a0w2K2tqWnlGSW9YS2xSakxGa00wRXd3RFFZSktvWklodmNOQVFFTApCUUFEZ2dFQkFFOU1nQ252WGdFUjdNRiswRUxZbkd1NnAwc1huZHk5WEQ4dEhPQkxROTUvZUE2Q2RRZ1h3WlB5CnVOT0F5U2dEaFRLdmJXNkNXcndwR2xDK1V3RlZBeWlOS25RY05JalhyK1I2bUJVRzRGUTZNM1YzYnpvbjJvUU0KNGxkSVpEZ0hwNThiekYrN1hYVlZWR3NTbkxKaGVGcUExcjNKWFNLV2ZydHo2VkVjSjR3d21wOXhqOC94ZDllYwpHeFNJeStaWngxZlIvWDFWVnpEVVkraVpCZS9mMVVFc2JxZWFUREh0ZThSYjBjZi9QQ1NCTFZDWnpSMjdwWE1YCmFUWElXWXlyMHVLcCtBZHRKOHhkV1FidzlGSkNNYjBEMStKdms2ck1VOUZRUHNCOXNzUjRwYWEvVXRLUm1YRlEKUnRnSmVkZUNIV1p6L3RnVm9EUXFEZnU1cW1wdzFSdz0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURWekNDQWorZ0F3SUJBZ0lSQU9IeTZQbVJBb0oyVGNiMjY1SkR3R1F3RFFZSktvWklodmNOQVFFTEJRQXcKRkRFU01CQUdBMVVFQXhNSlEybHNhWFZ0SUVOQk1CNFhEVEkxTURrd09URTFNelV6T1ZvWERUSTJNRGt3T1RFMQpNelV6T1Zvd0tqRW9NQ1lHQTFVRUF3d2ZLaTVrWldaaGRXeDBMbWgxWW1Kc1pTMW5jbkJqTG1OcGJHbDFiUzVwCmJ6Q0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQVA3ZEljdHZuY2N6WE0rRVVJYzkKQU0yRnN6SlBkNUt5Y1ZZZmkzRnpsSUNTUmEwL2FlTVc5Rm4wQXNYeG0rOUZCLzJIeXhtT0ExTm41STJ1YmNNOApHQzFiQndoOGh5NklFSUFwWlFrdVZLRlh4cGloZ3lWWVljVjhvL2NsTWZyb0kzYlZsQUJwWHJWZi8zeUNUeUJ0CjdXa3hLaDlLK0M3NGlOV1pjaWFDN2hSWklYWUZKNGJsOHRCQ3Ywc0pzbU9hVE9GeXc5Nktzek5VQ0lVUjVjRWQKNXR4RTViOG8zdWVEWEhMYnlFL29tZC9JbmswWDlmVlRXQVFNc1ZEV2dCSHQ1TWZBNk1FbFk1bEppVjNYODh4NQpPZkhHYXNNQWlrZzFuZnpGL3JIVFNvTkY2ZklwYmJqZHA0aXlMcWRwbk5UTnlxcktwcWFXUXBhRFYzbjQxZEhZCnVka0NBd0VBQWFPQmpUQ0JpakFPQmdOVkhROEJBZjhFQkFNQ0JhQXdIUVlEVlIwbEJCWXdGQVlJS3dZQkJRVUgKQXdFR0NDc0dBUVVGQndNQ01Bd0dBMVVkRXdFQi93UUNNQUF3SHdZRFZSMGpCQmd3Rm9BVWZ5SDdrTDYra2paeQpGSW9YS2xSakxGa00wRXd3S2dZRFZSMFJCQ013SVlJZktpNWtaV1poZFd4MExtaDFZbUpzWlMxbmNuQmpMbU5wCmJHbDFiUzVwYnpBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQWFabkRTUWo4NGpxRVlmTUdJVlBsNVI5SE14cDYKZGpiSDVITDBpTnpkT2RwVEVNdC9aWUtmb01LL082T0U1dis3cnhic2RMRitqS3JNM2lhUFNjZGFZNHAxOWpQdApzTWxEd09mUFFaQnAwL2VOQ3o1aXBGbjVzb2NOTFlTZ2xqd1QvRDRPVkkrQ1BGWXZPRzd1dzg4SDgwUUhnZkg2CjFtWko2T0lVT3cwWGQzc1MxZkpudmVSWVJ6eUd6YklLblZud3IrNm9pLzZaVEtaSHBJN0dUNHpLKzkrd0N4R2EKbzI4cmMxRXYwcVhnUUhQTFNERXZyUVdKNm81bVZGanVZR21JL21IeG1Db21TM1hnYlc0ak5tTmdybnNTTVJidwpacGlLb3hmTFFnOXlkU2xLMTY4MTZiZ3pPblg2d0NPQ1NhTVRGVXllSEk1YWJvNDUvbXV5eU5NWUZ3PT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  tls.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBL3QwaHkyK2R4ek5jejRSUWh6MEF6WVd6TWs5M2tySnhWaCtMY1hPVWdKSkZyVDlwCjR4YjBXZlFDeGZHYjcwVUgvWWZMR1k0RFUyZmtqYTV0d3p3WUxWc0hDSHlITG9nUWdDbGxDUzVVb1ZmR21LR0QKSlZoaHhYeWo5eVV4K3VnamR0V1VBR2xldFYvL2ZJSlBJRzN0YVRFcUgwcjRMdmlJMVpseUpvTHVGRmtoZGdVbgpodVh5MEVLL1N3bXlZNXBNNFhMRDNvcXpNMVFJaFJIbHdSM20zRVRsdnlqZTU0TmNjdHZJVCtpWjM4aWVUUmYxCjlWTllCQXl4VU5hQUVlM2t4OERvd1NWam1VbUpYZGZ6ekhrNThjWnF3d0NLU0RXZC9NWCtzZE5LZzBYcDhpbHQKdU4ybmlMSXVwMm1jMU0zS3FzcW1wcFpDbG9OWGVmalYwZGk1MlFJREFRQUJBb0lCQUhkalJ5MXhQOHZNdDdGTwpIaHI3N0tCWi9UT1lIajlONytHVUxWSWIvbmlzREkrM29QYU1Eak1GSnpkcWtzMW0zUE5hNVQwM1ZUK0E3NE9mCkxqUEN0dUNvUDRjdUxuVVJzQWtaV3djTitQOExpekI4bUY2cUpFTEt2RlJOekRmby9wUHdRTUJnbThrREN6OWMKRzR6cGNjbFJDcFpXSENTRXNEUy9DTVlabDBWWC9CRWN0RVp1eDVhOVI3V0RNYm1veTNyRXRVZHpXc1M1cExXNApxamJVUDdBeEo0eGNZdGlFSEhaZVJxbEtFdFlvOEpvUnhsSEJheXVVeXZPazJSSS9IR2lxekh4NGFiMkx1VnBGClNiYVFVK1BUUU9ROXRlV2tHZ2drUi9vT0Vwa3JpT1B4RlBEL1FVc0szM0VCUk5sZW81Y0lFMnV5cFNkZlpFVmwKRkkyY1hmRUNnWUVBL3p3VEdHU21DVmY3UW5FSlVoNE0yOHF6YjNMNm1OeEw3T2ZZcjYvUTRWMTV1bk40UnUxMwpWRUNRL2JaRUpjL3FFQnJ0OHJOQjdrbGdXZko3YmRjakF5YVNqNHpSbWEzQXJDYWEvaWhTWDJwTnIvRUdBRnZRCnowZ3BuNFFCSGpnYlR5Z3NTTHlNUkhCRnpEejA1b2ZDUExCcko5bHBMMjBIUjkyS0d0ellWRDhDZ1lFQS82REYKMFpuVjNBUGM1ZDBETjdSdjRUTGx3Ujk1aVUvQndBYkgzd3hwRmQ1eTZmRER0blNyT2ozZ2V2T3g1UGVGcENiZQp5em03UDhzbW9oU0s3Z045QWkrZEhHZDhoN293dDBaQ1hQbjFFVU4zd2FtSDJLV1FlTkJ4YU5VYzRnU3JYdzN6Ck1vS3JvSE1VdlhGYXZ4V3VGZlBmSCtpQ2pvYUthQmh2Y3FkNkMrY0NnWUVBZ3NBZXRCOVRZM1A3MWxTYnhzSjQKS2R4VVFhS3dOOENhOEpqd3kwZVJCUEppMnA0dW5uOGw0elpVVUhTZndwTVpQL2picnJvZjYxY1JrZUtEVW9pawplZ2UzaXV4RHI2dHdDWUNaWTl2NkhzRVJYVEZtdHFaU2VPMXB6VHJOYTlLb1FzdThxK0pUSlBneStXYTh1cUFQClpCR29RempBQnJpZXd6VDllN2RvNXZjQ2dZQkROckxNK2ZZUmM3S1JmaHRxZWpjd3I0RloxanpPcmZuejA5U2EKQVZsZ05xMWdkYjRBSzQwYU0wcmpDVkN0TTZnZ0VWaGpkenFVKzRXYytHblBTM3VESjZIWDVoNElVaHlkRkF3LwpCam81MzlPTlNGWS8wTWk3KzVMV1RiTGFldi9VYm9hVHNXZ1BPRE1yM0xKUHJCT3FFZ1dKRGtuRnovcDBoSGhKClhWL3A0UUtCZ0QydlRMSWNhR0VtNk84WktHNWRtNEZxamk5OW91RzVucnpSNk1MNFJNU2lua1BIMFhhMVFMa2UKeUNzcW1BOWQ3YVFublFwZEhQQjR2d1JYVlV0ZjVndjhpdW1keFhyZmMzUUh4RzBCaTY2UlV1SldFS01QMjk3VApRdXdBUVcxZHpaZ3hEQmMzOGVMekRHUHN4eFlWZlNlUXBGZVNjMERKalRDZklHcDdxcDRqCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
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
  # If you want metrics enabled in cilium-operator, set the port for
  # which the Cilium Operator will have their metrics exposed.
  # NOTE that this will open the port on the nodes where Cilium operator pod
  # is scheduled.
  operator-prometheus-serve-addr: ":9963"
  enable-metrics: "true"
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
  # default DNS proxy to transparent mode in non-chaining modes
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
    {"nonMasqueradeCIDRs":[]}
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
# Source: cilium/templates/cilium-envoy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cilium-envoy
  namespace: kube-system
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9964"
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
        cilium.io/cilium-configmap-checksum: "ac49d5e7dcae002a7e6db9dd16bb16df3d7df9f10c27c43d9c9f0b03fdc056eb"
      labels:
        k8s-app: cilium
        app.kubernetes.io/name: cilium-agent
        app.kubernetes.io/part-of: cilium
    spec:
      securityContext:
        seccompProfile:
          type: Unconfined
      containers:
      - name: cilium-agent
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
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
        - name: hubble-tls
          mountPath: /var/lib/cilium/tls/hubble
          readOnly: true
        - name: tmp
          mountPath: /tmp
        
      initContainers:
      - name: config
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
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
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
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
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
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
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
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
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
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
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
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
        seccompProfile:
          type: Unconfined
      containers:
      - name: cilium-envoy
        image: "quay.io/cilium/cilium-envoy:v1.33.6-1754542786-4d9638583910acb3e34d77e436cbd745d910a437@sha256:184240a145d656ab111cd2312deb6c46b94bc2c9d159c4811cf708b0848f8948"
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
        cilium.io/cilium-configmap-checksum: "ac49d5e7dcae002a7e6db9dd16bb16df3d7df9f10c27c43d9c9f0b03fdc056eb"
        prometheus.io/port: "9963"
        prometheus.io/scrape: "true"
      labels:
        io.cilium/app: operator
        name: cilium-operator
        app.kubernetes.io/part-of: cilium
        app.kubernetes.io/name: cilium-operator
    spec:
      containers:
      - name: cilium-operator
        image: "quay.io/cilium/operator-generic:v1.17.7@sha256:a610be2562d0f5a8945a27df7d5681711263ce92e09947e867fc37fc9ab08788"
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
# Source: cilium/templates/cilium-ingress-class.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: cilium
spec:
  controller: cilium.io/ingress-controller
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
---
# Source: cilium/templates/cilium-gateway-api-class.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: cilium
spec:
  controllerName: io.cilium/gateway-controller
  description: The default Cilium GatewayClass
