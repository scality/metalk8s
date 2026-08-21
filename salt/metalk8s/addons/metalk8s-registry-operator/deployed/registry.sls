#!jinja | metalk8s_kubernetes

apiVersion: metalk8s.scality.com/v1alpha1
kind: Registry
metadata:
  name: main
spec:
  namespace: metalk8s-registry
  nodeSelector:
    node-role.kubernetes.io/registry: ""
  server:
    certificateIssuerRef:
      name: metalk8s-registry-server-ca
      kind: ClusterIssuer
  agent:
    certificateIssuerRef:
      name: metalk8s-registry-agent-ca
      kind: ClusterIssuer
    authentication:
      mtls:
        caSecretRef:
          name: metalk8s-registry-agent-auth-ca
          namespace: metalk8s-registry
  mirrorPropagation:
    tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
      - key: node-role.kubernetes.io/bootstrap
        effect: NoSchedule
      - key: node-role.kubernetes.io/registry
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        effect: NoSchedule
    enabled: true
    ignorePaths:
      - metalk8s-registry-from-config.invalid # This one is still handled by salt until the migration to the new registry is fully completed
