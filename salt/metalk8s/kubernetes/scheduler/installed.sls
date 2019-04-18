{% from "metalk8s/registry/macro.sls" import kubernetes_image with context %}

include:
  - .kubeconfig

Create kube-scheduler Pod manifest:
  file.managed:
    - name: /etc/kubernetes/manifests/kube-scheduler.yaml
    - source: salt://metalk8s/kubernetes/files/control-plane-manifest.yaml
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
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
    - require:
      - metalk8s_kubeconfig: Create kubeconfig file for scheduler
