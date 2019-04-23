{%- if pillar['bootstrap_id'] not in salt['saltutil.runner']('manage.up') %}
Wait for minion authentication request:
  salt.wait_for_event:
    - name: salt/auth
    - id_list:
      - {{ pillar.bootstrap_id }}

Accept minion key:
  salt.wheel:
    - name: key.accept
    - match: {{ pillar.bootstrap_id }}
    - require:
      - salt: Wait for minion authentication request
    - require_in:
      - salt: Ping minion
{%- endif %}

Ping minion:
  salt.runner:
    - name: metalk8s_saltutil.wait_minions
    - tgt: {{ pillar.bootstrap_id }}
