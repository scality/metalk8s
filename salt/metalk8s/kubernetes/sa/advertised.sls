{%- set sa_pub_key_server = salt['mine.get'](pillar['metalk8s']['ca']['minion'], 'kubernetes_sa_pub_key_b64') %}

{%- if sa_pub_key_server %}

{%- set sa_pub_key_b64 = sa_pub_key_server[pillar['metalk8s']['ca']['minion']] %}
{%- set sa_pub_key = salt['hashutil.base64_b64decode'](sa_pub_key_b64) %}

Ensure SA pub key is present:
  file.managed:
    - name: /etc/kubernetes/pki/sa.pub
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ sa_pub_key.splitlines() }}

{%- else %}

Unable to get SA pub key, no kubernetes_sa_pub_key_b64 in mine:
  test.fail_without_changes: []

{%- endif %}

{%- set nodes = pillar['metalk8s']['nodes'] %}
{%- set roles = nodes.get(grains['id'], {}).get('roles', []) %}

{%- if 'master' in roles %}

{%- set sa_priv_key = pillar['metalk8s'].get('private', {}).get('sa_private_key') %}

{%- if sa_priv_key %}

Ensure SA private key is present:
  file.managed:
    - name: /etc/kubernetes/pki/sa.key
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ sa_priv_key.splitlines() }}

{%- else %}

Unable to get SA private key, missing 'metalk8s:certs:sa_private_key' in pillar:
  test.fail_without_changes: []

{%- endif %}

{%- endif %}
