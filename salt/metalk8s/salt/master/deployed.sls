{% set salt_master_image = 'salt-master' %}
{% set salt_master_version = '2018.3.3-1' %}
{% set registry_url = 'localhost:5000' %}

Create salt master directories:
  file.directory:
    - user: root
    - group: root
    - mode: '0700'
    - makedirs: true
    - names:
      - /etc/salt
      - /var/cache/salt
      - /var/run/salt

Install and start salt master manifest:
  file.managed:
    - name: /etc/kubernetes/manifests/salt-master-pod.yaml
    - source: salt://metalk8s/salt/master/files/salt-master-pod.yaml.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: false
    - backup: false
    - defaults:
        registry_url: {{ registry_url }}
      salt_master_image: {{ salt_master_image }}
      salt_master_version: {{ salt_master_version }}
    - require:
      - file: Create salt master directories

Make sure salt master container is up:
  cmd.run:
    - name: "[[ -n $(crictl ps --state RUNNING --label io.kubernetes.container.name=salt-master -q) ]]"
    - retry:
        attempts: 10
        interval: 3
        until: True
    - require:
      - file: Install and start salt master manifest

