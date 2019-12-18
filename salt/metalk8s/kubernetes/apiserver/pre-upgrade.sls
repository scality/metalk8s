{%- set cp_nodes = salt.metalk8s.minions_by_role('master') | sort %}

# Always run this state as it does not change anything if certs are already
# good
Ensure all apiservers serve a certificate for 127.0.0.1:
  salt.state:
    - tgt: {{ cp_nodes | join(",") }}
    - tgt_type: list
    - sls:
      - metalk8s.internal.upgrade.apiserver-cert-localhost
    - saltenv: {{ saltenv }}
    - batch: 1
