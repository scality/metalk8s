# prepare dependencies
include:
  - metalk8s.roles.internal.node-without-calico

# add the member to the cluster
Register the node into etcd cluster:
  salt.runner:
    - name: state.orchestrate
    - pillar: {{ pillar | json  }}
    - mods:
      - metalk8s.orchestrate.register_etcd

Create etcd database directory:
  file.directory:
    - name: /var/lib/etcd
    - dir_mode: 750
    - user: root
    - group: root
    - makedirs: True
    - require:
      - salt: Register the node into etcd cluster