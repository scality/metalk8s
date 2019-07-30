{% from "metalk8s/repo/macro.sls" import build_image_name with context %}
{% from "metalk8s/map.jinja" import networks with context %}

include:
  - .kubeconfig
  - metalk8s.kubernetes.ca.kubernetes.advertised
  - metalk8s.kubernetes.sa.advertised

Create kube-controller-manager Pod manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/kube-controller-manager.yaml
    - source: salt://metalk8s/kubernetes/files/control-plane-manifest.yaml
    - config_files:
        - /etc/kubernetes/controller-manager.conf
        - /etc/kubernetes/pki/ca.crt
        - /etc/kubernetes/pki/sa.key
    - context:
        name: kube-controller-manager
        image_name: {{ build_image_name("kube-controller-manager") }}
        host: {{ grains['metalk8s']['control_plane_ip'] }}
        port: 10252
        scheme: HTTP
        command:
          - kube-controller-manager
          - --address={{ grains['metalk8s']['control_plane_ip'] }}
          - --allocate-node-cidrs=true
          - --cluster-cidr={{ networks.pod }}
          - --controllers=*,bootstrapsigner,tokencleaner
          - --kubeconfig=/etc/kubernetes/controller-manager.conf
          - --leader-elect=true
          - --node-cidr-mask-size=24
          - --root-ca-file=/etc/kubernetes/pki/ca.crt
          - --service-account-private-key-file=/etc/kubernetes/pki/sa.key
          - --use-service-account-credentials=true
        requested_cpu: 200m
        volumes:
          - path: /etc/pki
            name: etc-pki
          - path: /etc/kubernetes/pki
            name: k8s-certs
          - path: /etc/ssl/certs
            name: ca-certs
          - path: /etc/kubernetes/controller-manager.conf
            name: kubeconfig
            type: File
    - require:
      - metalk8s_kubeconfig: Create kubeconfig file for controller-manager
