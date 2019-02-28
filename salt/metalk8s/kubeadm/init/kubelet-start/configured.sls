{%- from "metalk8s/map.jinja" import kubelet with context %}

Create kubelet service environment file:
  file.managed:
    - name: "/var/lib/kubelet/kubeadm-flags.env"
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
    - name: "/var/lib/kubelet/config.yaml"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - formatter: yaml
    - dataset:
        kind: KubeletConfiguration
        apiVersion: kubelet.config.k8s.io/v1beta1
        staticPodPath: /etc/kubernetes/manifests

Configure kubelet service as standalone:
  file.managed:
    - name: /etc/systemd/system/kubelet.service.d/09-standalone.conf
    - source: salt://metalk8s/kubeadm/init/kubelet-start/files/service-kubelet-{{ grains['init'] }}.conf
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - context:
        env_file: "/var/lib/kubelet/kubeadm-flags.env"
        manifest_path: "/etc/kubernetes/manifests"
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
      - file: Configure kubelet service as standalone

