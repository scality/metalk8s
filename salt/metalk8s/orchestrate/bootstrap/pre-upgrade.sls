Refresh CA minion:
  salt.state:
    - sls:
      - metalk8s.roles.ca
    - tgt: {{ pillar.metalk8s.ca.minion }}
    - saltenv: {{ saltenv }}
    - sync_mods: all

Prepare for Salt Master upgrade:
  salt.state:
    - sls:
      - metalk8s.salt.master.certs
      - metalk8s.salt.master.kubeconfig
      - metalk8s.kubernetes.apiserver-proxy
      - metalk8s.repo.installed
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: {{ saltenv }}
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
      - salt: Prepare for Salt Master upgrade
