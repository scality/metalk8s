{%- do salt.log.info('Printing context in minion-start reactor:') %}
{%- do salt.log.info(show_full_context() | yaml(False)) %}

Provision Volumes backing storage:
  runner.state.orchestrate:
    - args:
        - mods: metalk8s.orchestrate.provision-volumes
        - saltenv: {{ saltenv }}
        - pillar:
            orchestrate:
              node_name: {{ data.id }}

{%- endif %}
