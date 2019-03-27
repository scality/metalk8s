{% from "metalk8s/registry/macro.sls" import build_image_name with context %}
{% from "metalk8s/map.jinja" import networks with context %}

{% set image_name = build_image_name('etcd', '3.2.18') %}

{% set host_name = salt.network.get_hostname() %}
{% set ip_candidates = salt.network.ip_addrs(cidr=networks.control_plane) %}
{% if ip_candidates %}
{% set host = ip_candidates[0] %}

Create etcd database directory:
  file.directory:
    - name: /var/lib/etcd
    - dir_mode: 750
    - user: root
    - group: root
    - makedirs: True

Create local etcd Pod manifest:
  file.managed:
    - name: /etc/kubernetes/manifests/etcd.yaml
    - source: salt://metalk8s/kubeadm/init/etcd/files/manifest.yaml
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - context:
        name: etcd
        image_name: {{ image_name }}
        command:
          - etcd
          - --advertise-client-urls=https://{{ host }}:2379
          - --cert-file=/etc/kubernetes/pki/etcd/server.crt
          - --client-cert-auth=true
          - --data-dir=/var/lib/etcd
          - --initial-advertise-peer-urls=https://{{ host }}:2380
          - --initial-cluster={{ host_name }}=https://{{ host }}:2380
          - --key-file=/etc/kubernetes/pki/etcd/server.key
          - --listen-client-urls=https://127.0.0.1:2379,https://{{ host }}:2379
          - --listen-peer-urls=https://{{ host }}:2380
          - --name={{ host_name }}
          - --peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt
          - --peer-client-cert-auth=true
          - --peer-key-file=/etc/kubernetes/pki/etcd/peer.key
          - --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
          - --snapshot-count=10000
          - --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
        volumes:
          - path: /var/lib/etcd
            name: etcd-data
          - path: /etc/kubernetes/pki/etcd
            name: etcd-certs
            readOnly: true
    - require:
      - file: Create etcd database directory



{% else %}
No available advertise IP for etcd:
  test.fail_without_changes:
    - msg: "Could not find available IP in {{ networks.control_plane }}"
{% endif %}
