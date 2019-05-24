{% from "metalk8s/repo/macro.sls" import kubernetes_image with context %}

include:
  - .kubeconfig

Create kube-scheduler Pod manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/kube-scheduler.yaml
    - source: salt://metalk8s/kubernetes/files/control-plane-manifest.yaml
    - config_files:
      - /etc/kubernetes/scheduler.conf
    - context:
        name: kube-scheduler
        image_name: {{ kubernetes_image("kube-scheduler") }}
        host: 127.0.0.1
        port: 10251
        scheme: HTTP
        command:
          - kube-scheduler
          - --address=127.0.0.1
          - --kubeconfig=/etc/kubernetes/scheduler.conf
          - --leader-elect=true
        requested_cpu: 100m
        volumes:
          - path: /etc/kubernetes/scheduler.conf
            name: kubeconfig
            type: File
    - onchanges:
      - metalk8s_kubeconfig: Create kubeconfig file for scheduler
