saltstack-repo:
  pkgrepo.managed:
    - humanname: SaltStack repo for RHEL/CentOS $releasever
    - baseurl: https://repo.saltstack.com/yum/redhat/\$releasever/\$basearch/archive/2018.3.3
    - enabled: true
    - gpgcheck: true
    - gpgkey: https://repo.saltstack.com/yum/redhat/$releasever/$basearch/archive/2018.3.3/SALTSTACK-GPG-KEY.pub

salt-minion:
  pkg.installed: []
  service.running:
    - enable: true
    - watch:
        - pkg: salt-minion
