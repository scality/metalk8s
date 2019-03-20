{% from "metalk8s/map.jinja" import metalk8s with context %}

{% set registry_image = 'docker.io/registry' %}
{% set registry_version = '2.7.1' %}
{% set registry_user = 'metalk8s-registry' %}
{% set registry_group = 'metalk8s-registry' %}

Inject OCI registry image:
  containerd.image_managed:
    - name: docker.io/library/registry:2.7.1
    - archive_path: {{ metalk8s.iso_root_path }}/images/registry-2.7.1.tar

Create OCI registry user:
  group.present:
    - name: {{ registry_group }}
    - system: true

  user.present:
    - name: {{ registry_user }}
    - fullname: MetalK8s Registry
    - gid: {{ registry_group }}
    - shell: /sbin/nologin
    - home: /var/lib/registry
    - createhome: false
    - system: true

  file.directory:
    - name: /var/lib/registry
    - user: {{ registry_user }}
    - group: root
    - mode: '0700'

Install OCI registry manifest:
  file.managed:
    - name: /etc/kubernetes/manifests/registry.yaml
    - source: salt://metalk8s/registry/files/registry-pod.yaml.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: false
    - backup: false
    - require:
      - group: Create OCI registry user
      - user: Create OCI registry user
      - file: Create OCI registry user
    - defaults:
        registry_image: {{ registry_image }}
        registry_version: {{ registry_version }}
        registry_user: {{ registry_user }}
        registry_group: {{ registry_group }}
