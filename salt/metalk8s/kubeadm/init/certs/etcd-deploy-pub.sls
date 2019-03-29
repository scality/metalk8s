{%- set etcd_ca_pub = salt['mine.get']('*', 'kubernetes_etcd_ca_server') %}

{%- if etcd_ca_pub %}

{%- set etcd_ca_pub_content_64 = etcd_ca_pub.values()[0] %}
{%- set etcd_ca_pub_content = salt['hashutil.base64_b64decode'](etcd_ca_pub_content_64) %}

Ensure etcd CA is present:
  file.managed:
    - name: /etc/kubernetes/pki/etcd/ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ etcd_ca_pub_content.splitlines() }}

{%- endif %}
