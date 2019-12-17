{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

include:
- metalk8s.node.grains
- metalk8s.kubernetes.kubelet.running

Create apiserver-proxy nginx configuration:
  file.managed:
    - name: /var/lib/metalk8s/apiserver-proxy.conf
    - source: salt://{{ slspath }}/files/apiserver-proxy.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0444'
    - makedirs: true
    - dir_mode: '0755'

Create apiserver-proxy Pod manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/apiserver-proxy.yaml
    - source: salt://{{ slspath }}/files/apiserver-proxy.yaml.j2
    - config_files:
      - /var/lib/metalk8s/apiserver-proxy.conf
    - context:
        image_name: {{ build_image_name("nginx") }}
    - require:
      - file: Create apiserver-proxy nginx configuration

Make sure apiserver-proxy is available:
  http.wait_for_successful_query:
  - name: http://127.0.0.1:7080/healthz
  - status: 200
  - require:
    - metalk8s: Create apiserver-proxy Pod manifest
