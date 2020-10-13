{%- set dest_version = pillar.metalk8s.cluster_version %}

Refresh CA minion:
  salt.state:
    - sls:
      - metalk8s.roles.ca
    - tgt: {{ pillar.metalk8s.ca.minion }}
    - saltenv: metalk8s-{{ dest_version }}
    - sync_mods: all

Prepare for Salt Master downgrade:
  salt.state:
    - sls:
      - metalk8s.salt.master.certs
      - metalk8s.salt.master.kubeconfig
      - metalk8s.kubernetes.apiserver-proxy
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: metalk8s-{{ dest_version }}
    - sync_mods: all
    - require:
      - salt: Refresh CA minion

Wait for an API server to be available through local proxy:
  http.wait_for_successful_query:
    - name: https://127.0.0.1:7443/healthz
    - match: 'ok'
    - status: 200
    - verify_ssl: false
    - require:
      - salt: Prepare for Salt Master downgrade
