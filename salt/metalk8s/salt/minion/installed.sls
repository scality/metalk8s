{%- from "metalk8s/macro.sls" import pkg_installed with context %}

{% if grains.os_family == 'RedHat' %}
include :
  - metalk8s.repo

Install salt-minion:
  {{ pkg_installed('salt-minion') }}
    - require:
      - test: Repositories configured

{% elif grains.os == 'Ubuntu' %}
Install python-apt:
  pkg.installed:
    - name: python-apt

Configure Salt repository:
  pkgrepo.managed:
    - humanname: saltstack
    - name: deb http://repo.saltstack.com/apt/ubuntu/18.04/amd64/archive/2018.3.4 bionic main
    - file: /etc/apt/sources.list.d/saltstack.list
    - key_url: https://repo.saltstack.com/apt/ubuntu/18.04/amd64/archive/2018.3.4/SALTSTACK-GPG-KEY.pub
    - require:
        - pkg: Install python-apt

Install salt-minion:
  pkg.installed:
    - name: salt-minion
    - require:
        - pkgrepo: Configure Salt repository
{% endif %}
