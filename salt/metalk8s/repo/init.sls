{%- if grains.os_family == 'RedHat' %}
include:
  - .configured
{% elif grains.os == 'Ubuntu' %}
Configure Kubernetes repo:
  pkgrepo.managed:
    - humanname: kubernetes
    - name: deb http://apt.kubernetes.io/ kubernetes-xenial main
    - file: /etc/apt/sources.list.d/kubernetes.list
    - key_url: https://packages.cloud.google.com/apt/doc/apt-key.gpg
{% endif %}
