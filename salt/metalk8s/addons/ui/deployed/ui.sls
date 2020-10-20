include:
- .namespace

{%- from "metalk8s/addons/nginx-ingress-control-plane/control-plane-ip.sls"
    import ingress_control_plane with context
%}

Create metalk8s-ui deployment:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/metalk8s-ui-deployment.yaml
    - template: jinja

Create metalk8s-ui service:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: metalk8s-ui
          namespace: metalk8s-ui
          labels:
            run: metalk8s-ui
        spec:
          ports:
          - port: 80
            protocol: TCP
            targetPort: 80
          selector:
            app: metalk8s-ui
          type: ClusterIP

Create metalk8s-ui ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: metalk8s-ui
          namespace: metalk8s-ui
        data:
          config.json: |
            {
              "url": "/api/kubernetes",
              "url_salt": "/api/salt",
              "url_prometheus": "/api/prometheus",
              "url_grafana": "/grafana",
              "url_oidc_provider": "/oidc",
              "url_redirect": "https://{{ ingress_control_plane }}/oauth2/callback",
              "url_doc": "/docs",
              "url_alertmanager": "/api/alertmanager"
            }

Create ui-branding ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: ui-branding
          namespace: metalk8s-ui
        data:
          theme.json: |
            {"theme":{"light":{"brand":{"alert":"#A39300","base":"#607080","primary":"#FAF9FB","primaryDark1":"#F7F6F9","primaryDark2":"#EDEAF0","secondary":"#037AFF","secondaryDark1":"#1C3D59","secondaryDark2":"#1C2E3F","success":"#006F62","healthy":"#24871D","healthyLight":"#33A919","warning":"#946F00","danger":"#AA1D05","critical":"#BE321F","background":"#ffffff","backgroundBluer":"#ECF4FF","textPrimary":"#313B44","textSecondary":"#8593A0","textTertiary":"#A7B6C3","borderLight":"#EBEBEB","border":"#A5A5A5","info":"#8C8C8C"},"logo_path":"/brand/assets/branding-light.svg"},"dark":{"brand":{"alert":"#FFE508","base":"#7B7B7B","primary":"#1D1D1F","primaryDark1":"#171717","primaryDark2":"#0A0A0A","secondary":"#055DFF","secondaryDark1":"#1C3D59","secondaryDark2":"#1C2E3F","success":"#006F62","healthy":"#30AC26","healthyLight":"#69E44C","warning":"#FFC10A","danger":"#AA1D05","critical":"#BE321F","background":"#121212","backgroundBluer":"#192A41","textPrimary":"#FFFFFF","textSecondary":"#B5B5B5","textTertiary":"#DFDFDF","borderLight":"#A5A5A5","border":"#313131","info":"#434343"},"logo_path":"/brand/assets/branding-dark.svg"},"custom":{}},"default":"dark"}
