{% set control_plane_ips = salt['network.ip_addrs'](cidr=salt['pillar.get']('networks:control_plane')) %}
{% if pillar.metalk8s.api_server.keepalived.enabled %}
{%   set control_plane_ips = control_plane_ips | difference([pillar.metalk8s.api_server.host]) | list | sort %}
{% endif %}

{% if control_plane_ips %}
{%   if 'metalk8s' not in grains
        or 'control_plane_ip' not in grains['metalk8s']
        or grains['metalk8s']['control_plane_ip'] not in control_plane_ips %}
Set control_plane_ip grain:
  grains.present:
    - name: metalk8s:control_plane_ip
    - value: {{ control_plane_ips[0] }}
{%   else %}
control_plane_ip grain already set and valid:
  test.succeed_without_changes
{%   endif %}
{% else %}
No control-plane network interface present on the host:
  test.fail_without_changes
{% endif %}

{% set workload_plane_ips = salt['network.ip_addrs'](cidr=salt['pillar.get']('networks:workload_plane')) %}
{% if workload_plane_ips %}
{%   if 'metalk8s' not in grains
        or 'workload_plane_ip' not in grains['metalk8s']
        or grains['metalk8s']['workload_plane_ip'] not in workload_plane_ips %}
Set workload_plane_ip grain:
  grains.present:
    - name: metalk8s:workload_plane_ip
    - value: {{ workload_plane_ips[0] }}
{%   else %}
workload_plane_ip grain already set and valid:
  test.succeed_without_changes
{%   endif %}
{% else %}
No workload-plane network interface present on the host:
  test.fail_without_changes
{% endif %}
