{%- from "metalk8s/map.jinja" import defaults with context %}
{%- from "metalk8s/map.jinja" import kubeadm_preflight with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install mandatory packages:
  pkg.installed:
    - pkgs: {{ kubeadm_preflight.mandatory.packages }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}

{%- if kubelet.container_engine %}
Enable {{ kubelet.container_engine }} service:
  service.running:
    - name: {{ kubelet.container_engine }}
    - enable: true
    - require_in:
      - test: Check that the crictl socket answer
{%- endif %}

# required to set sysctl net.bridge.bridge-nf-call-iptables
Add the module br_netfilter to kernel:
  kmod.present:
    - name: br_netfilter
    - persist: True

{%- for item, value in kubeadm_preflight.mandatory.sysctl_values.items() %}
Set sysctl {{ item }} value to {{ value }}:
  sysctl.present:
    - name: {{ item }}
    - value: {{ value }}
    - config: /etc/sysctl.d/60-metalk8s.conf
    {%- if item in ("net.bridge.bridge-nf-call-ip6tables", "net.bridge.bridge-nf-call-iptables") %}
    - require:
      - kmod: Add the module br_netfilter to kernel
    {%- endif %}
{%- endfor %}

{%- for swap_device in salt.mount.swaps().keys() %}
Disable swap device {{ swap_device }}:
  module.run:
    - mount.swapoff:
      - name: {{ swap_device  }}
{%- endfor %}

Prevent swap mount from fstab:
  file.comment:
    - name: /etc/fstab
    - regex: .+\s+.+\s+swap\s+.+
    - onlyif:
      # Add a condition to avoid the state failure
      # in case we don t have swap in /etc/fstab
      - test -n "$(awk '$3=="swap" {print}' /etc/fstab)"

Check that the crictl socket answer:
  # use test.succeed_without_changes instead of cmd.run for idempotency
  test.succeed_without_changes:
    - name: crictl --runtime-endpoint {{ kubelet.service.options.get("container-runtime-endpoint") }} info
    - check_cmd:
      - crictl --runtime-endpoint {{ kubelet.service.options.get("container-runtime-endpoint") }} info

{%- if not defaults.upgrade %}
  {%- for port in kubeadm_preflight.mandatory.ports %}
    {%- set res = salt.network.connect('127.0.0.1', port)['result'] %}
    {%- if res == false %}
The port {{ port }} is free:
  test.succeed_without_changes: []
    {%- else %}
The port {{ port }} is not free:
  test.succeed_without_changes: []
    {%- endif %}
  {%- endfor %}
{%- endif %}
