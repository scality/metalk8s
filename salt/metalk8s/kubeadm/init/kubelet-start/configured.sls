{%- from "metalk8s/map.jinja" import kubelet with context %}

Create kubelet service environment file:
  file.managed:
    - name: {{ kubelet.service.environment_file }}
    - source: salt://metalk8s/kubeadm/init/kubelet-start/files/kubeadm.env
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - context:
        options: {{ kubelet.service.options }}

Create kubelet config file:
  file.serialize:
    - name: {{ kubelet.config_file }}
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - formatter: yaml
    - dataset: {{ kubelet.config }}       

{%- set kubelet_service_config = salt['file.join'](
          kubelet.service.config_path,
          kubelet.service.config_name) %}
Configure kubelet service:
  file.managed:
    - name: {{ kubelet_service_config }}
    - source: salt://metalk8s/kubeadm/init/kubelet-start/files/service-kubelet-{{ grains['init'] }}.conf
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - context:
        env_file: {{ kubelet.service.environment_file }}
        conf_file: {{ kubelet.config_file }}
    - require:
      - file: Create kubelet service environment file
      - file: Create kubelet config file

Start and enable kubelet:
  service.running:
    - name: kubelet
    - enable: True
    - watch:
      - file: Create kubelet service environment file
      - file: Create kubelet config file
      - file: Configure kubelet service

