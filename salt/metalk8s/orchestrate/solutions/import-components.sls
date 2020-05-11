{%- set bootstrap_id = pillar.bootstrap_id %}
{%- set version = pillar.metalk8s.nodes[bootstrap_id].version %}

Import the Solutions archives:
  salt.state:
    - tgt: {{ bootstrap_id }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.solutions.available

Update Solutions configuration:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.addons.solutions.deployed.configmap
    - require:
      - salt: Import the Solutions archives

Configure registry:
  salt.state:
    - tgt: {{ bootstrap_id }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.repo.installed
    - require:
      - salt: Update Solutions configuration
