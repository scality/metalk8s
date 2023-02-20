{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set encryption_k8s_path = "/etc/kubernetes/encryption.conf" %}

include:
  - metalk8s.kubernetes.ca.advertised
  - metalk8s.kubernetes.sa.advertised
  - metalk8s.addons.nginx-ingress.ca.advertised
  - .certs

{%- set host = grains['metalk8s']['control_plane_ip'] %}
{%- set etcd_servers = [] %}
{#- NOTE: Filter out members with empty name as they are not started yet. #}
{%- for member in pillar.metalk8s.etcd.members | selectattr('name') %}
{%-   do etcd_servers.extend(member['client_urls']) %}
{%- endfor %}
{%- set etcd_servers = etcd_servers | sort %}
{%- if 'etcd' in pillar.metalk8s.nodes[grains.id].roles %}
{%-   do etcd_servers.insert(0, "https://" ~ host ~ ":2379") %}
{%- endif %}
{%- set etcd_servers = etcd_servers | unique %}

{%- set feature_gates = [] %}
{%- for feature, value in pillar.kubernetes.get("apiServer", {}).get("featureGates", {}).items() %}
{%-   if value is sameas True %}
{%-     set value = "true" %}
{%-   elif value is sameas False %}
{%-     set value = "false" %}
{%-   endif %}
{%-   do feature_gates.append(feature ~ "=" ~ value) %}
{%- endfor %}

{%- set oidc_config = {} %}
{%- if pillar.kubernetes.get("apiServer", {}).get("oidc") %}
  {%- do oidc_config.update(pillar.kubernetes.apiServer.oidc) %}
{%- elif pillar.addons.dex.enabled and salt.metalk8s_network.get_control_plane_ingress_endpoint() %}
  {%- do oidc_config.update({
    "issuerURL": salt.metalk8s_network.get_control_plane_ingress_endpoint() ~ "/oidc",
    "clientID": "oidc-auth-client",
    "CAFile": "/etc/metalk8s/pki/nginx-ingress/ca.crt",
    "usernameClaim": "email",
    "groupsClaim": "groups",
  }) %}
{%- endif %}

{%- set pod_name = "kube-apiserver-" ~ grains.id %}
{%- set last_pod_id = salt.cri.get_pod_id(
  name=pod_name, state="ready", ignore_not_found=True
) %}

Create kube-apiserver Pod manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/kube-apiserver.yaml
    - source: salt://metalk8s/kubernetes/files/control-plane-manifest.yaml.j2
    - config_files:
        - {{ encryption_k8s_path }}
        - {{ certificates.server.files.apiserver.path }}
        - /etc/kubernetes/pki/apiserver.key
        - {{ certificates.client.files['apiserver-etcd'].path }}
        - /etc/kubernetes/pki/apiserver-etcd-client.key
        - {{ certificates.client.files['apiserver-kubelet'].path }}
        - /etc/kubernetes/pki/apiserver-kubelet-client.key
        - /etc/kubernetes/pki/ca.crt
        - /etc/kubernetes/pki/etcd/ca.crt
        - /etc/kubernetes/pki/front-proxy-ca.crt
        - {{ certificates.client.files['front-proxy'].path }}
        - /etc/kubernetes/pki/front-proxy-client.key
        - /etc/kubernetes/pki/sa.key
        - /etc/kubernetes/pki/sa.pub
        - /etc/metalk8s/pki/nginx-ingress/ca.crt
    - context:
        name: kube-apiserver
        host: {{ host }}
        image_name: {{ build_image_name("kube-apiserver") }}
        port: 6443
        scheme: HTTPS
        liveness_path: /livez
        readiness_path: /readyz
        command:
        # kubeadm flags {
          - kube-apiserver
          - --advertise-address={{ host }}
          - --allow-privileged=true
          - --authorization-mode=Node,RBAC
          - --client-ca-file=/etc/kubernetes/pki/ca.crt
          - --enable-admission-plugins=NodeRestriction
          - --enable-bootstrap-token-auth=true
          - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
          - --etcd-certfile={{ certificates.client.files['apiserver-etcd'].path }}
          - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
          - --etcd-servers={{ etcd_servers | join(",") }}
          - --kubelet-client-certificate={{ certificates.client.files['apiserver-kubelet'].path }}
          - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
          - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
          - --proxy-client-cert-file={{ certificates.client.files['front-proxy'].path }}
          - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
          - --requestheader-allowed-names=front-proxy-client
          - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
          - --requestheader-extra-headers-prefix=X-Remote-Extra-
          - --requestheader-group-headers=X-Remote-Group
          - --requestheader-username-headers=X-Remote-User
          - --secure-port=6443
          - --service-account-issuer=https://kubernetes.default.svc.{{ coredns.cluster_domain }}
          - --service-account-key-file=/etc/kubernetes/pki/sa.pub
          - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
          - --service-cluster-ip-range={{ networks.service }}
          - --tls-cert-file={{ certificates.server.files.apiserver.path }}
          - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
        # }
          - --bind-address={{ host }}
          - --encryption-provider-config={{ encryption_k8s_path }}
          - --cors-allowed-origins=.*
          {%- if oidc_config %}
          - --oidc-issuer-url={{ oidc_config.issuerURL }}
          - --oidc-client-id={{ oidc_config.clientID }}
          - --oidc-ca-file={{ oidc_config.CAFile }}
          - --oidc-username-claim={{ oidc_config.usernameClaim }}
          - --oidc-groups-claim={{ oidc_config.groupsClaim }}
          - '"--oidc-username-prefix=oidc:"'
          - '"--oidc-groups-prefix=oidc:"'
          {%- endif %}
          - --v={{ 2 if metalk8s.debug else 0 }}
          {% if feature_gates %}
          - --feature-gates={{ feature_gates | join(",") }}
          {%- endif %}
        requested_cpu: 250m
        volumes:
          - path: {{ encryption_k8s_path }}
            type: File
            name: k8s-encryption
          {%- if grains['os_family'] == 'RedHat' %}
          - path: /etc/pki
            name: etc-pki
          {%- endif %}
          - path: /etc/kubernetes/pki
            name: k8s-certs
          - path: /etc/metalk8s/pki
            name: metalk8s-certs
          - path: /etc/ssl/certs
            name: ca-certs
    - require:
      - file: Ensure kubernetes CA cert is present
      - file: Ensure etcd CA cert is present
      - file: Ensure front-proxy CA cert is present
      - file: Ensure SA pub key is present
      - file: Ensure Ingress CA cert is present

{%- if last_pod_id %}
Restart kubelet to make it pick up the manifest changes:
  service.running:
    - name: kubelet
    - watch:
      - metalk8s: Create kube-apiserver Pod manifest
    - unless:
      # Do not restart kubelet if we see the Pod was updated
      - fun: cri.wait_pod
        name: {{ pod_name }}
        last_id: {{ last_pod_id }}
        timeout: 120
        raise_on_timeout: false
    - require_in:
      - module: Make sure kube-apiserver container is up and ready

{%- endif %}

Make sure kube-apiserver container is up and ready:
  module.run:
    - cri.wait_container:
      - name: kube-apiserver
      - state: running
      - timeout: 120
    - onchanges:
      - metalk8s: Create kube-apiserver Pod manifest
  http.wait_for_successful_query:
    - name: https://{{ host }}:6443/healthz
    - verify_ssl: True
    - ca_bundle: /etc/kubernetes/pki/ca.crt
    - status: 200
    - match: 'ok'
    - require:
      - module: Make sure kube-apiserver container is up and ready
