{% from "metalk8s/map.jinja" import networks with context %}
{% from "metalk8s/kubeadm/init/control-plane/lib.sls" import get_image_name with context %}
{% set htpasswd_path = "/etc/kubernetes/htpasswd" %}

Set up default basic auth htpasswd:
  file.managed:
    - name: {{ htpasswd_path }}
    - source: salt://metalk8s/kubeadm/init/control-plane/files/htpasswd
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 750

{% set ip_candidates = salt.network.ip_addrs(cidr=networks.control_plane) %}
{% if ip_candidates %}
{% set host = ip_candidates[0] %}
Create kube-apiserver Pod manifest:
  file.managed:
    - name: /etc/kubernetes/manifests/kube-apiserver.yaml
    - source: salt://metalk8s/kubeadm/init/control-plane/files/manifest.yaml
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - context:
        name: kube-apiserver
        host: {{ host }}
        image_name: {{ get_image_name("kube-apiserver") }}
        port: 6443
        scheme: HTTPS
        command:
          - kube-apiserver
          - --authorization-mode=Node,RBAC
          - --advertise-address={{ host }}
          - --allow-privileged=true
          - --basic-auth-file={{ htpasswd_path }}
          - --client-ca-file=/etc/kubernetes/pki/ca.crt
          - --enable-admission-plugins=NodeRestriction
          - --enable-bootstrap-token-auth=true
          - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
          - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
          - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
          - --etcd-servers=https://127.0.0.1:2379
          - --insecure-port=0
          - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
          - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
          - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
          - --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
          - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
          - --requestheader-allowed-names=front-proxy-client
          - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
          - --requestheader-extra-headers-prefix=X-Remote-Extra-
          - --requestheader-group-headers=X-Remote-Group
          - --requestheader-username-headers=X-Remote-User
          - --secure-port=6443
          - --service-account-key-file=/etc/kubernetes/pki/sa.pub
          - --service-cluster-ip-range={{ networks.service }}
          - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
          - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
        requested_cpu: 250m
        volumes:
          - path: /etc/pki
            name: etc-pki
          - path: /etc/kubernetes/pki
            name: k8s-certs
          - path: /etc/ssl/certs
            name: ca-certs
          - path: {{ htpasswd_path }}
            type: File
            name: htpasswd
{% else %}
No available advertise IP for kube-apiserver:
  test.fail_without_changes:
    - msg: "Could not find available IP in {{ networks.control_plane }}"
{% endif %}
