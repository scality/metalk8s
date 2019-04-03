{%- set sa_pub_key_server = salt['mine.get']('*', 'kubernetes_sa_pub_key_b64') %}

{%- if sa_pub_key_server %}

{%- set sa_pub_key_b64 = sa_pub_key_server.values()[0] %}
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

{%- endif %}
