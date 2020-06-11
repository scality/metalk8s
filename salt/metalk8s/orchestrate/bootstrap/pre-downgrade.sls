# NOTE: Salt Master states changed in 2.4.4/2.5.1
{%- set dest_version = pillar.metalk8s.cluster_version %}
{%- set old_style = (dest_version == "2.5.0" or
                     salt.pkg.version_cmp(dest_version, "2.4.3") <= 0) %}

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
    {%- if not old_style %}
      - metalk8s.salt.master.kubeconfig
      - metalk8s.kubernetes.apiserver-proxy
    {%- endif %}
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: metalk8s-{{ dest_version }}
    - sync_mods: all
    - require:
      - salt: Refresh CA minion

{%- if not old_style %}

Wait for an API server to be available through local proxy:
  http.wait_for_successful_query:
    - name: https://127.0.0.1:7443/healthz
    - match: 'ok'
    - status: 200
    - verify_ssl: false
    - require:
      - salt: Prepare for Salt Master downgrade

{%- endif %}
