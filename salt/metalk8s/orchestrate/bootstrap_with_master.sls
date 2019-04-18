Bootstrap CA:
  salt.state:
    - tgt: {{ pillar['bootstrap_id'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.certs.ca

Bootstrap client certs:
  salt.state:
    - tgt: {{ pillar['bootstrap_id'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.certs.clients
    - require:
      - salt: Bootstrap CA

Bootstrap control plane:
  salt.state:
    - tgt: {{ pillar['bootstrap_id'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.kubeconfig
      - metalk8s.bootstrap.control-plane
      - metalk8s.bootstrap.etcd
    - require:
      - salt: Bootstrap client certs
    - pillar:
        registry_ip: {{ pillar.get('registry_ip') }}

Wait for kube-apiserver to be ready:
  salt.runner:
    - name: salt.cmd
    - arg:
      - fun: metalk8s.wait_apiserver
    - require:
      - salt: Bootstrap control plane

Bootstrap services:
  salt.state:
    - tgt: {{ pillar['bootstrap_id'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.services
    - require:
      - salt: Wait for kube-apiserver to be ready

Bootstrap node:
  salt.state:
    - tgt: {{ pillar['bootstrap_id'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.mark_control_plane
      - metalk8s.bootstrap.addons
      - metalk8s.bootstrap.calico
    - require:
      - salt: Wait for kube-apiserver to be ready
    - pillar:
        registry_ip: {{ pillar.get('registry_ip') }}
