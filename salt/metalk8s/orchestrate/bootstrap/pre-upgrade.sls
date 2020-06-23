# NOTE: apiserver-proxy specifics are only needed for 2.4.4/2.5.1 or higher,
#       when coming from 2.4.[0-1]. They can be removed in development/2.7

Refresh CA minion:
  salt.state:
    - sls:
      - metalk8s.roles.ca
    - tgt: {{ pillar.metalk8s.ca.minion }}
    - saltenv: {{ saltenv }}
    - sync_mods: all

# Always run this state as it does not change anything if certs are already
# good
Ensure all apiservers serve a certificate for 127.0.0.1:
  salt.state:
    - tgt: {{ salt['metalk8s.minions_by_role']('master') | join(',') }}
    - tgt_type: list
    - batch: 1
    - sls:
      - metalk8s.internal.upgrade.apiserver-cert-localhost
    - saltenv: {{ saltenv }}
    - sync_mods: all
    - require:
      - salt: Refresh CA minion

Prepare for Salt Master upgrade:
  salt.state:
    - sls:
      - metalk8s.salt.master.certs
      - metalk8s.salt.master.kubeconfig
      - metalk8s.kubernetes.apiserver-proxy
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: {{ saltenv }}
    - sync_mods: all
    - require:
      - salt: Ensure all apiservers serve a certificate for 127.0.0.1

Wait for an API server to be available through local proxy:
  http.wait_for_successful_query:
    - name: https://127.0.0.1:7443/healthz
    - match: 'ok'
    - status: 200
    - verify_ssl: false
    - require:
      - salt: Prepare for Salt Master upgrade
