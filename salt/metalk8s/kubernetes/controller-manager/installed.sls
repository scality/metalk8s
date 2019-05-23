{% from "metalk8s/repo/macro.sls" import kubernetes_image with context %}
{% from "metalk8s/map.jinja" import networks with context %}

include:
  - .kubeconfig

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
        image_name: {{ kubernetes_image("kube-controller-manager") }}
        host: 127.0.0.1
        port: 10252
        scheme: HTTP
        command:
          - kube-controller-manager
          - --address=127.0.0.1
          - --allocate-node-cidrs=true
          - --cluster-cidr={{ networks.pod }}
          - --cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt
          - --cluster-signing-key-file=/etc/kubernetes/pki/ca.key
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
    - onchanges:
      - metalk8s_kubeconfig: Create kubeconfig file for controller-manager
