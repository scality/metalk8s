# Generate the AuthenticationConfiguration file consumed by kube-apiserver
# via --authentication-config.
#
# It carries:
#   * `anonymous` -- limits anonymous access to the kubelet probe endpoints
#     (/livez, /readyz, /healthz) so kubelet httpGet probes keep working,
#     while every other path (/version, /api/*, ...) still requires
#     authentication.
#   * `jwt` -- the OIDC issuer (Dex by default, or a pillar override). This
#     replaces the legacy --oidc-* command-line flags, which are mutually
#     exclusive with --authentication-config in Kubernetes 1.32+
#     (pkg/kubeapiserver/options/authentication.go: "authentication-config
#     file and oidc-* flags are mutually exclusive").
#
# Relies on the AnonymousAuthConfigurableEndpoints and
# StructuredAuthenticationConfiguration feature gates, both beta and
# on-by-default in Kubernetes 1.32+.
{%- from "metalk8s/map.jinja" import kube_api with context %}

include:
  - .installed
  - metalk8s.addons.nginx-ingress.ca.advertised

{%- set authn_config_path = kube_api.authn_config_path %}

{#- Build the OIDC issuer config and resolve the matching CA PEM, mirroring the
    historical --oidc-* selection logic that used to live in installed.sls.
    AuthenticationConfiguration's `jwt[].issuer.certificateAuthority` field
    expects PEM content inline (not a file path), so each branch resolves the
    CA the way that fits its source:
      * pillar override -- read the user-specified CAFile from the salt master.
      * default Dex     -- pull the Ingress CA from the salt mine
                           (`ingress_ca_b64`, published by
                           `metalk8s.addons.nginx-ingress.ca.installed`), which
                           avoids any ordering dependency on the on-disk file. #}
{%- set oidc_config = {} %}
{%- set ca_pem = '' %}
{%- if pillar.kubernetes.get("apiServer", {}).get("oidc") %}
{%-   do oidc_config.update(pillar.kubernetes.apiServer.oidc) %}
{%-   if oidc_config.get('CAFile') %}
{%-     set ca_pem = salt['file.read'](oidc_config.CAFile) %}
{%-   endif %}
{%- elif pillar.addons.dex.enabled and salt.metalk8s_network.get_control_plane_ingress_endpoint() %}
{%-   do oidc_config.update({
        "issuerURL": salt.metalk8s_network.get_control_plane_ingress_endpoint() ~ "/oidc",
        "clientID": "oidc-auth-client",
        "CAFile": "/etc/metalk8s/pki/nginx-ingress/ca.crt",
        "usernameClaim": "email",
        "groupsClaim": "groups",
      }) %}
{%-   set ingress_ca_mine = salt['mine.get'](pillar.metalk8s.ca.minion, 'ingress_ca_b64') %}
{%-   if ingress_ca_mine %}
{%-     set ca_pem = salt['hashutil.base64_b64decode'](ingress_ca_mine[pillar.metalk8s.ca.minion]) %}
{%-   endif %}
{%- endif %}


Create kube-apiserver authentication configuration:
  file.serialize:
    - name: {{ authn_config_path }}
    - mode: '0600'
    - user: root
    - group: root
    - makedirs: True
    - dataset:
        apiVersion: apiserver.config.k8s.io/v1
        kind: AuthenticationConfiguration
        anonymous:
          enabled: true
          conditions:
          - path: /livez
          - path: /readyz
          - path: /healthz
        {%- if oidc_config and ca_pem %}
        jwt:
        - issuer:
            url: {{ oidc_config.issuerURL }}
            audiences:
            - {{ oidc_config.clientID }}
            certificateAuthority: {{ ca_pem | tojson }}
          claimMappings:
            username:
              claim: {{ oidc_config.usernameClaim }}
              prefix: "oidc:"
            groups:
              claim: {{ oidc_config.groupsClaim }}
              prefix: "oidc:"
          {%- if oidc_config.usernameClaim == 'email' %}
          claimValidationRules:
          - expression: "claims.?email_verified.orValue(true) == true"
            message: "email_verified claim must be true when set"
          {%- endif %}
        {%- endif %}
    - require_in:
      - metalk8s: Create kube-apiserver Pod manifest
