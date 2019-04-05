{%- from 'metalk8s/kubeadm/init/kubeconfig/lib.sls' import kubeconfig with context %}

{%- set hostname = salt.network.get_hostname() %}

{%- set ca_cert_b64 = salt['mine.get']('*', 'kubernetes_ca_server').values()[0] %}
{%- set ca_cert = salt['hashutil.base64_b64decode'](ca_cert_b64) %}

{%- set cert_info = {'CN': 'system:node:' ~ hostname, 'O': 'system:nodes'} %}

{{ kubeconfig('kubelet', cert_info) }}

Ensure CA cert is present:
  file.managed:
    - name: /etc/kubernetes/pki/ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ ca_cert.splitlines() }}

Configure kubelet service:
  file.managed:
    - name: /etc/systemd/system/kubelet.service.d/10-metalk8s.conf
    - source: salt://{{ slspath }}/files/service-kubelet-{{ grains['init'] }}.conf
    - template: jinja
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - context:
        env_file: "/var/lib/kubelet/kubeadm-flags.env"
        config_file: "/var/lib/kubelet/config.yaml"
    - require:
      - metalk8s_kubeconfig: Create kubeconf file for kubelet

Restart kubelet:
  service.running:
    - name: kubelet
    - enable: True
    - watch:
      - file: Configure kubelet service
      - file: Ensure CA cert is present
      - metalk8s_kubeconfig: Create kubeconf file for kubelet
