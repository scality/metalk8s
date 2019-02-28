{%- from 'metalk8s/kubeadm/init/kubeconfig/lib.sls' import kubeconfig with context %}

{%- set hostname = salt.network.get_hostname() %}

{%- set cert_info = {'CN': 'system:node:' ~ hostname, 'O': 'system:nodes'} %}

{{ kubeconfig('kubelet', cert_info) }}

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
