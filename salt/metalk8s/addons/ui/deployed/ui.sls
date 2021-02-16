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
              "url_doc": "/docs",
              "url_alertmanager": "/api/alertmanager"
            }
