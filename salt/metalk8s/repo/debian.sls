Install python-apt:
  pkg.installed:
    - name: python-apt 

Configure Kubernetes repository:
  pkgrepo.managed:
    - humanname: kubernetes
    - name: deb http://apt.kubernetes.io/ kubernetes-xenial main
    - file: /etc/apt/sources.list.d/metalk8s.list
    - key_url: https://packages.cloud.google.com/apt/doc/apt-key.gpg
    - require:
      - pkg: Install python-apt

Configure Salt repository:
  pkgrepo.managed:
    - humanname: saltstack
    - name: deb http://repo.saltstack.com/apt/ubuntu/18.04/amd64/archive/2018.3.4 bionic main
    - file: /etc/apt/sources.list.d/metalk8s.list
    - key_url: https://repo.saltstack.com/apt/ubuntu/18.04/amd64/archive/2018.3.4/SALTSTACK-GPG-KEY.pub
    - require:
      - pkg: Install python-apt

Repositories configured:
  test.succeed_without_changes:
    - require:
      - pkgrepo: Configure Kubernetes repository
      - pkgrepo: Configure Salt repository
