{%- from "metalk8s/map.jinja" import certificates with context %}

{%- set sls = [] %}
{%- set post_mods = [] %}

{%- for cert_type in ['client', 'kubeconfig', 'server'] %}
  {%- for cert in certificates[cert_type].files.values() %}
    {%- if cert['path'] in pillar.orchestrate.certificates %}
      {%- set renew = cert.get('renew', {}) %}
      {%- do sls.extend(renew.get('sls', [])) %}
      {%- do post_mods.extend(renew.get('post', {}).get('orch', [])) %}
    {%- endif %}
  {%- endfor %}
{%- endfor %}

Renew expired certificates:
  salt.state:
    - tgt: {{ pillar.orchestrate.target }}
    - sls: {{ sls | unique | json }}

{%- if post_mods %}
Run post certificate renewal actions:
  salt.runner:
    - name: state.orchestrate
    - mods: {{ post_mods | unique | json }}
    - saltenv: {{ saltenv }}
    - require:
      - salt: Renew expired certificates
{%- endif %}
