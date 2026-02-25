{%- from "metalk8s/map.jinja" import repo with context %}

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

{%- set ingress_ca_file = 'namespace_metalk8s-ingress.secret_ingress-control-plane-default-certificate.tls.crt' %}

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
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
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
              serviceAccountName: oidc-proxy
              initContainers:
              - name: k8s-sidecar
                image: {{ repo.registry_endpoint }}/{{ saltenv }}/k8s-sidecar:1.28.0
                imagePullPolicy: IfNotPresent
                restartPolicy: Always
                env:
                - name: LABEL
                  value: metalk8s.scality.com/version
                - name: FOLDER
                  value: /tmp/secrets
                - name: NAMESPACE
                  value: metalk8s-ingress
                - name: RESOURCE
                  value: secret
                - name: UNIQUE_FILENAMES
                  value: "true"
                volumeMounts:
                - name: secrets-volume
                  mountPath: /tmp/secrets
              containers:
              - name: oauth2-proxy
                image: {{ repo.registry_endpoint }}/{{ saltenv }}/oauth2-proxy/oauth2-proxy:v7.6.0
                args:
                - --provider=oidc
                - --oidc-issuer-url={{ alertmanager_oidc.get('issuer', '') }}
                - --client-id={{ alertmanager_oidc.get('audience', '') }}
                - --cookie-secret=MDEyMzQ1Njc4OWFiY2RlZmdoaWprbG1ub3BxcnN0dXY=
                - --client-secret=unused-but-required
                - --skip-jwt-bearer-tokens=true
                - --email-domain=*
                - --upstream=http://prometheus-operator-alertmanager.metalk8s-monitoring.svc:9093
                - --oidc-groups-claim={{ alertmanager_oidc.get('groupsClaim', 'roles') }}
                {%- for group in alertmanager_oidc.get('authorizedGroups', []) %}
                - --allowed-group={{ group }}
                {%- endfor %}
                - --provider-ca-file=/tmp/secrets/{{ ingress_ca_file }}
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
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        spec:
          selector:
            app: oauth2-proxy-alertmanager
          ports:
          - port: 4180

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
