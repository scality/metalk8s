{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import coredns with context %}

{%- set alertmanager_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/prometheus-operator/config/alertmanager.yaml',
        saltenv=saltenv
    )
%}

{%- set alertmanager = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-monitoring', 'metalk8s-alertmanager-config', alertmanager_defaults
    )
%}

{%- set alertmanager_oidc_enabled = alertmanager.spec.get('config', {}).get('enable_oidc_authentication', False) %}
{%- set alertmanager_oidc = alertmanager.spec.get('config', {}).get('oidc', {}) %}

{%- set alertmanager_oidc_ca = alertmanager_oidc.get('caSecret', {}) %}
{%- set ca_namespace = alertmanager_oidc_ca.get('namespace', 'metalk8s-ingress') %}
{%- set ca_name = alertmanager_oidc_ca.get('name', 'ingress-control-plane-default-certificate') %}

{%- set ca_file = 'namespace_' ~ ca_namespace ~ '.secret_' ~ ca_name ~ '.tls.crt' %}

{%- if alertmanager_oidc_enabled %}

Create oauth2-proxy-alertmanager Deployment:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: oauth2-proxy-alertmanager
          namespace: metalk8s-monitoring
          labels:
            app: oauth2-proxy-alertmanager
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: oauth2-proxy-alertmanager
          template:
            metadata:
              labels:
                app: oauth2-proxy-alertmanager
            spec:
              serviceAccountName: oidc-proxy-alertmanager
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
                - name: SCRIPT
                  value: /scripts/restart-on-ca-change.py
                - name: DEPLOYMENT_NAMESPACE
                  value: metalk8s-monitoring
                - name: DEPLOYMENT_NAME
                  value: oauth2-proxy-alertmanager
                - name: CA_DIR
                  value: /tmp/secrets
                - name: CA_FILE_NAME
                  value: {{ ca_file }}
                volumeMounts:
                - name: secrets-volume
                  mountPath: /tmp/secrets
                - name: restart-script
                  mountPath: /scripts
                  readOnly: true
              containers:
              - name: oauth2-proxy
                image: {{ build_image_name("oauth2-proxy") }}
                args:
                - --provider=oidc
                - --oidc-issuer-url={{ alertmanager_oidc.get('issuer', '') }}
                - --client-id={{ alertmanager_oidc.get('audience', '') }}
                # cookie-secret is required by oauth2-proxy but never used since all
                # authentication goes through JWT bearer tokens (--skip-jwt-bearer-tokens=true).
                # Any valid base64-encoded 32-byte value works here.
                - --cookie-secret=MDEyMzQ1Njc4OWFiY2RlZmdoaWprbG1ub3BxcnN0dXY=
                - --client-secret=unused-but-required
                - --skip-jwt-bearer-tokens=true
                - --email-domain=*
                - --upstream=http://prometheus-operator-alertmanager.metalk8s-monitoring.svc:9093
                - --oidc-groups-claim={{ alertmanager_oidc.get('groupsClaim', 'roles') }}
                {%- for group in alertmanager_oidc.get('authorizedGroups', []) %}
                - --allowed-group={{ group }}
                {%- endfor %}
                - --provider-ca-file=/tmp/secrets/{{ ca_file }}
                - --http-address=0.0.0.0:9093
                ports:
                - containerPort: 9093
                volumeMounts:
                - name: secrets-volume
                  mountPath: /tmp/secrets
                  readOnly: true
              volumes:
              - name: secrets-volume
                emptyDir: {}
              - name: restart-script
                configMap:
                  name: oidc-proxy-restart-script
                  defaultMode: "0555"

Create oauth2-proxy-alertmanager Service:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: oauth2-proxy-alertmanager
          namespace: metalk8s-monitoring
          labels:
            app: oauth2-proxy-alertmanager
        spec:
          selector:
            app: oauth2-proxy-alertmanager
          ports:
          - port: 9093

{%- else %}

Ensure oauth2-proxy-alertmanager Deployment does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oauth2-proxy-alertmanager
    - namespace: metalk8s-monitoring
    - kind: Deployment
    - apiVersion: apps/v1

Ensure oauth2-proxy-alertmanager Service does not exist:
  metalk8s_kubernetes.object_absent:
    - name: oauth2-proxy-alertmanager
    - namespace: metalk8s-monitoring
    - kind: Service
    - apiVersion: v1

{%- endif %}

Create alertmanager-proxy Service:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: alertmanager-proxy
          namespace: metalk8s-monitoring
          labels:
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        spec:
          type: ExternalName
          {%- if alertmanager_oidc_enabled %}
          externalName: oauth2-proxy-alertmanager.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
          {%- else %}
          externalName: prometheus-operator-alertmanager.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}
          {%- endif %}
          ports:
          - port: 9093
