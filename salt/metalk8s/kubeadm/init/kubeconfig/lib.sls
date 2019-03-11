{%- from "metalk8s/map.jinja" import defaults with context %}
{%- from "metalk8s/map.jinja" import networks with context %}
{%- from "metalk8s/map.jinja" import kube_api with context %}

{% macro kubeconfig(name, cert_info) %}

{%- set ca_server = salt['mine.get']('*', 'kubernetes_ca_server').keys() | list %}
{#- TODO: Not always use local machine as apiserver #}
{%- set apiserver = 'https://' ~ salt['network.ip_addrs'](cidr=networks.control_plane)[0] ~ ':6443' %}

{%- if ca_server %}

Create kubeconf file for {{ name }}:
  metalk8s_kubeconfig.managed:
    - name: /etc/kubernetes/{{ name }}.conf
    - ca_server: {{ ca_server[0] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - client_cert_info:
        {%- for key, value in cert_info.items() %}
        {{ key }}: {{ value }}
        {%- endfor %}
    - apiserver: {{ apiserver }}
    - cluster: {{ defaults.cluster }}

{%- else %}

Unable to generate {{ name }} kubeconf file, no CA Server available:
  test.fail_without_changes: []

{%- endif %}
{%- endmacro %}
