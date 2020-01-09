include:
- .namespace

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
           {"theme": {"light":{ "brand":{ "base": "#F7F6F9","baseContrast1": "#ECF4FF","primary": "#313B44","secondary": "#e99121","success": "#23AD56","info": "#00B2A9", "warning": "#F1B434","danger": "#EF3340","background": "#ffffff","backgroundContrast1": "#F7F6F9","backgroundContrast2": "#FAF9FB","text":"#000000","border":"#000000"},"logo_path":"/brand/assets/branding-light.svg"},"dark":{"brand":{"base": "#121214", "baseContrast1": "#192A41","primary": "#A7B6C3","secondary": "#2979ff","success": "#23AD56","info": "#00B2A9","warning": "#F1B434","danger": "#EF3340","background": "#0D0D0D","backgroundContrast1": "#1D1D21","backgroundContrast2": "#171717","text": "#ffffff","border": "#ffffff"},"logo_path":"/brand/assets/branding-dark.svg"},"custom":{}},"default": "light"}
