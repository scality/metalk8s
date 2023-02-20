{%- set bootstrap_node = salt.metalk8s.minions_by_role('bootstrap') | first %}
Check pillar content on {{ bootstrap_node }}:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ bootstrap_node }}
    - kwarg:
        keys:
          - metalk8s.endpoints.repositories
          - metalk8s.cluster_config.status.controlPlane.ingress.ip
        raise_error: False
    - retry:
        attempts: 5

Regenerate Control Plane Ingress cert on {{ bootstrap_node }}:
  salt.state:
    - tgt: {{ bootstrap_node }}
    - sls:
      - metalk8s.addons.nginx-ingress-control-plane.certs
    - saltenv: {{ saltenv }}
    - require:
      - salt: Check pillar content on {{ bootstrap_node }}

Reconfigure Control Plane Ingress:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.addons.nginx-ingress-control-plane.deployed
    - saltenv: {{ saltenv }}
    - require:
      - salt: Regenerate Control Plane Ingress cert on {{ bootstrap_node }}

Reconfigure Control Plane components:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.addons.dex.deployed
    - metalk8s.addons.prometheus-operator.deployed
    - metalk8s.addons.ui.deployed
  - saltenv: {{ saltenv }}
  - require:
    - salt: Reconfigure Control Plane Ingress

{%- set master_nodes = salt.metalk8s.minions_by_role('master') %}
{%- for node in master_nodes | sort %}

Reconfigure apiserver on {{ node }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.apiserver
    - saltenv: {{ saltenv }}
    - require:
      - salt: Reconfigure Control Plane components
    {%- if loop.previtem is defined %}
      - salt: Reconfigure apiserver on {{ loop.previtem }}
    {%- endif %}

{%- endfor %}
