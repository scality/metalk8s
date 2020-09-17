{%- set node_name = pillar.orchestrate.node_name %}
{%- set version = pillar.metalk8s.nodes[node_name].version %}

Wait for Volumes to be available in {{ node_name }}'s pillar:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node_name }}
    - kwarg:
        keys:
          - metalk8s.volumes
        raise_error: False
    - retry:
        attempts: 5

Provision Volumes backing storage on '{{ node_name }}':
  salt.state:
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.volumes.provisioned
