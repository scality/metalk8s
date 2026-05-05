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

include:
  - .installed
  - metalk8s.addons.nginx-ingress.ca.advertised

{%- set authn_config_path = '/etc/kubernetes/authentication-config.yaml' %}

{#- Build the OIDC issuer config, mirroring the historical --oidc-* selection
    logic that used to live in installed.sls. #}
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

{#- AuthenticationConfiguration's `jwt[].issuer.certificateAuthority` field
    expects PEM content inline, not a file path. For the default Dex case the
    Ingress CA is published in the salt mine as `ingress_ca_b64` by
    `metalk8s.addons.nginx-ingress.ca.installed`, which avoids any ordering
    dependency on the on-disk file. For a pillar-provided OIDC override we
    fall back to reading the user-specified CAFile from the salt master. #}
{%- set ca_pem = '' %}
{%- if oidc_config %}
{%-   set ingress_ca_path = '/etc/metalk8s/pki/nginx-ingress/ca.crt' %}
{%-   if oidc_config.get('CAFile') == ingress_ca_path %}
{%-     set ingress_ca_mine = salt['mine.get'](pillar.metalk8s.ca.minion, 'ingress_ca_b64') %}
{%-     if ingress_ca_mine %}
{%-       set ca_pem = salt['hashutil.base64_b64decode'](ingress_ca_mine[pillar.metalk8s.ca.minion]) %}
{%-     endif %}
{%-   elif oidc_config.get('CAFile') %}
{%-     set ca_pem = salt['file.read'](oidc_config.CAFile) %}
{%-   endif %}
{%- endif %}

{#- TODO(MK8S-258): bump apiVersion to apiserver.config.k8s.io/v1 once metalk8s
    pins Kubernetes >= 1.34. AuthenticationConfiguration is registered in
    v1beta1 in 1.32/1.33 and promotes to v1 (GA) in 1.34. #}
{%- set authn_config = {
  "apiVersion": "apiserver.config.k8s.io/v1beta1",
  "kind": "AuthenticationConfiguration",
  "anonymous": {
    "enabled": True,
    "conditions": [
      {"path": "/livez"},
      {"path": "/readyz"},
      {"path": "/healthz"},
    ],
  },
} %}

{%- if oidc_config and ca_pem %}
{%-   set jwt_authenticator = {
    "issuer": {
      "url": oidc_config.issuerURL,
      "audiences": [oidc_config.clientID],
      "certificateAuthority": ca_pem,
    },
    "claimMappings": {
      "username": {"claim": oidc_config.usernameClaim, "prefix": "oidc:"},
      "groups": {"claim": oidc_config.groupsClaim, "prefix": "oidc:"},
    },
} %}
{#- Reproduce the legacy --oidc-username-claim=email implicit guard: when the
    username claim is `email`, kube-apiserver used to auto-require
    `email_verified == true`. With AuthenticationConfiguration, we have to
    spell the rule out as a CEL expression. #}
{%-   if oidc_config.usernameClaim == 'email' %}
{%-     do jwt_authenticator.update({
      "claimValidationRules": [
        {
          "expression": "claims.?email_verified.orValue(true) == true",
          "message": "email_verified claim must be true when set",
        },
      ],
}) %}
{%-   endif %}
{%-   do authn_config.update({"jwt": [jwt_authenticator]}) %}
{%- endif %}

Create kube-apiserver authentication configuration:
  file.serialize:
    - name: {{ authn_config_path }}
    - mode: '0600'
    - user: root
    - group: root
    - makedirs: True
    - dataset: {{ authn_config | tojson }}
    - require_in:
      - metalk8s: Create kube-apiserver Pod manifest
