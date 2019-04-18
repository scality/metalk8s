{%- set etcd_ca_server = salt['mine.get'](pillar['metalk8s']['ca']['minion'], 'kubernetes_etcd_ca_b64') %}

{%- if etcd_ca_server %}

{%- set etcd_ca_b64 = etcd_ca_server[pillar['metalk8s']['ca']['minion']] %}
{%- set etcd_ca = salt['hashutil.base64_b64decode'](etcd_ca_b64) %}

Ensure etcd CA cert is present:
  file.managed:
    - name: /etc/kubernetes/pki/etcd/ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ etcd_ca.splitlines() }}

{%- else %}

Unable to get etcd CA cert, no kubernetes_etcd_ca_b64 in mine:
  test.fail_without_changes: []

{%- endif %}
