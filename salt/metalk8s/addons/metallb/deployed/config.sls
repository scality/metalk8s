include:
  - .namespace

Create MetalLB ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metallb-config
          namespace: metalk8s-loadbalancing
        data:
          config: |
            address-pools:
            - name: control-plane-ingress-ip
              protocol: layer2
              addresses:
              - {{ salt.metalk8s_network.get_control_plane_ingress_ip() }}/32
              auto-assign: false
