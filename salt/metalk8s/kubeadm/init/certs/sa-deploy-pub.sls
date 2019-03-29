{%- set sa_pub = salt['mine.get']('*', 'kubernetes_sa_pub') %}

{%- if sa_pub %}

{%- set sa_pub_content_64 = sa_pub.values()[0] %}
{%- set sa_pub_content = salt['hashutil.base64_b64decode'](sa_pub_content_64) %}

Ensure SA pub key is present:
  file.managed:
    - name: /etc/kubernetes/pki/sa.pub
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ sa_pub_content.splitlines() }}

{%- endif %}
