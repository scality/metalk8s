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
              "url_doc": "/docs"
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
           {"theme": {"light":{"brand":{"base": "#607080", "primary": "#FAF9FB", "primaryDark1": "#F7F6F9", "primaryDark2": "#EDEAF0", "secondary": "#037AFF", "secondaryDark1": "#1C3D59", "secondaryDark2": "#1C2E3F", "success": "#006F62", "healthy": "#25AC56", "healthyLight": "#75FE63", "warning": "#FFC10A", "danger": "#EF3340", "critical": "#BE2543", "background": "#ffffff", "backgroundBluer": "#ECF4FF", "textPrimary": "#313B44", "textSecondary": "#8593A0", "borderLight": "#A5A5A5", "border": "#A5A5A5"},"logo_path": "/brand/assets/branding-light.svg"},"dark": {"base": "#6A7B92", "primary": "#1D1D1F", "primaryDark1": "#171718", "primaryDark2": "#0A0A0A", "secondary": "#037AFF", "secondaryDark1": "#1C3D59", "secondaryDark2": "#1C2E3F", "success": "#006F62", "healthy": "#25AC56", "healthyLight": "#75FE63", "warning": "#FFC10A", "danger": "#EF3340", "critical": "#BE2543", "background": "#121214", "backgroundBluer": "#182A41", "textPrimary": "#FFFFFF", "textSecondary": "#A8B5C1", "borderLight": "#2C3137", "border": "#A5A5A5"},"logo_path":"/brand/assets/branding-dark.svg"},"custom":{}},"default": "dark"}
