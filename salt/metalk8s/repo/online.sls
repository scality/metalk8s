{%- from "metalk8s/map.jinja" import repo with context %}

Configure EPEL repository:
  pkg.installed:
  {%- if grains["os"] == "CentOs" %}
    - name: epel-release
  {%- else %}
    - sources:
      - epel-release: https://dl.fedoraproject.org/pub/epel/epel-release-latest-{{ grains['osmajorrelease'] }}.noarch.rpm
  {%- endif %}

{%- if grains["os"] == "RedHat" %}
check that the system is registered:
  cmd.run:
    - name: subscription-manager status
{%- endif %}

Configure Kubernetes repository:
  pkgrepo.managed:
    - name: {{ repo.kubernetes.name }}
    - humanname: Kubernetes
    - baseurl: "https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64"
    - gpgcheck: 1
    - repo_gpg_check: 1
    - gpgkey: "https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg"
    - enabled: 0
