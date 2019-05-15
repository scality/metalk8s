{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

{% if grains.os_family == 'RedHat' %}
Install calico-cni-plugin:
  {{ pkg_installed('calico-cni-plugin') }}
    - require:
      - test: Repositories configured
{% else %}
/opt/cni:
  file.directory

/opt/cni/bin:
  file.directory:
    - require:
      - file: /opt/cni

/opt/cni/bin/calico-ipam:
  file.managed:
    - source: https://github.com/projectcalico/cni-plugin/releases/download/v3.7.2/calico-ipam-amd64
    - mode: '0755'
    - skip_verify: true # Bleh
    - require:
      - file: /opt/cni/bin

/opt/cni/bin/calico:
  file.managed:
    - source: https://github.com/projectcalico/cni-plugin/releases/download/v3.7.2/calico-amd64
    - mode: '0755'
    - skip_verify: true # Bleh
    - require:
      - file: /opt/cni/bin

Install calico-cni-pluugin:
  test.succeed_without_changes:
    - require:
      - file: /opt/cni/bin/calico
      - file: /opt/cni/bin/calico-ipam
{% endif %}
