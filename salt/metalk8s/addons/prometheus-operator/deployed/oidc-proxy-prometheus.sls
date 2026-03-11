{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set prometheus_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/prometheus.yaml',
        saltenv=saltenv
    )
%}

{%- set prometheus = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-prometheus-config', prometheus_defaults
    )
%}

{%- set prometheus_oidc_enabled = prometheus.spec.config.get('enable_oidc_authentication', False) %}
{%- set prometheus_oidc = prometheus.spec.config.get('oidc', {}) %}

{%- set prometheus_oidc_ca = prometheus_oidc.get('caSecret', {}) %}
{%- set ca_namespace = prometheus_oidc_ca.get('namespace', '') %}
{%- set ca_name = prometheus_oidc_ca.get('name', '') %}
{%- set ca_configured = ca_namespace and ca_name %}
{%- set ca_file = 'namespace_' ~ ca_namespace ~ '.secret_' ~ ca_name ~ '.tls.crt' %}

{%- if prometheus_oidc_enabled %}

Create oauth2-proxy-prometheus Deployment:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: oauth2-proxy-prometheus
          namespace: metalk8s-monitoring
          labels:
            app: oauth2-proxy-prometheus
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: oauth2-proxy-prometheus
          template:
            metadata:
              labels:
                app: oauth2-proxy-prometheus
            spec:
              serviceAccountName: oidc-proxy-prometheus
              {%- if ca_configured %}
              initContainers:
              - name: k8s-sidecar
                image: {{ build_image_name("k8s-sidecar") }}
                imagePullPolicy: IfNotPresent
                restartPolicy: Always
                env:
                - name: LABEL
                  value: metalk8s.scality.com/oidc-ca
                - name: FOLDER
                  value: /tmp/secrets
                - name: NAMESPACE
                  value: {{ ca_namespace }}
                - name: RESOURCE
                  value: secret
                - name: UNIQUE_FILENAMES
                  value: "true"
                volumeMounts:
                - name: secrets-volume
                  mountPath: /tmp/secrets
              {%- endif %}
              containers:
              - name: oauth2-proxy
                image: {{ build_image_name("oauth2-proxy") }}
                args:
                - --provider=oidc
                - --oidc-issuer-url={{ prometheus_oidc.get('issuer', '') }}
                - --client-id={{ prometheus_oidc.get('audience', '') }}
                # cookie-secret is required by oauth2-proxy but never used since all
                # authentication goes through JWT bearer tokens (--skip-jwt-bearer-tokens=true).
                # Any valid base64-encoded 32-byte value works here.
                - --cookie-secret=MDEyMzQ1Njc4OWFiY2RlZmdoaWprbG1ub3BxcnN0dXY=
                - --client-secret=unused-but-required
                - --skip-jwt-bearer-tokens=true
                - --email-domain=*
                - --upstream=http://thanos-query-http.metalk8s-monitoring.svc:10902
                - --oidc-groups-claim={{ prometheus_oidc.get('groupsClaim', 'roles') }}
                {%- for group in prometheus_oidc.get('authorizedGroups', []) %}
                - --allowed-group={{ group }}
                {%- endfor %}
                {%- if ca_configured %}
                - --provider-ca-file=/tmp/secrets/{{ ca_file }}
                {%- endif %}
                - --http-address=0.0.0.0:4180
                ports:
                - containerPort: 4180
                volumeMounts:
                - name: secrets-volume
                  mountPath: /tmp/secrets
                  readOnly: true
              volumes:
              - name: secrets-volume
                emptyDir: {}

Create oauth2-proxy-prometheus Service:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: oauth2-proxy-prometheus
          namespace: metalk8s-monitoring
          labels:
            app: oauth2-proxy-prometheus
        spec:
          selector:
            app: oauth2-proxy-prometheus
          ports:
          - port: 4180

{%- else %}

Ensure oauth2-proxy-prometheus Deployment does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oauth2-proxy-prometheus
    - namespace: metalk8s-monitoring
    - kind: Deployment
    - apiVersion: apps/v1

Ensure oauth2-proxy-prometheus Service does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oauth2-proxy-prometheus
    - namespace: metalk8s-monitoring
    - kind: Service
    - apiVersion: v1

{%- endif %}
