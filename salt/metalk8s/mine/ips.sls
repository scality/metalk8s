{%- from "metalk8s/map.jinja" import networks with context %}

Advertise control plane network IPs in the mine:
  module.run:
    - mine.send:
      - func: control_plane_ips
      - mine_function: network.ip_addrs
      - cidr: {{ networks.control_plane }}
