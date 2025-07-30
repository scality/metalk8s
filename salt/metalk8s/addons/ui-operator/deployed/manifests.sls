{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

include:
  - .namespace

{%- set ui_operator_image = build_image_name('ui-operator') %}

Deploy UI Operator:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: ui-operator
          namespace: metalk8s-ui
          labels:
            app.kubernetes.io/name: ui-operator
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
        spec:
          replicas: 1
          selector:
            matchLabels:
              app.kubernetes.io/name: ui-operator
          template:
            metadata:
              labels:
                app.kubernetes.io/name: ui-operator
            spec:
              serviceAccountName: ui-operator
              containers:
              - name: ui-operator
                image: {{ ui_operator_image }}
                env:
                - name: POD_NAMESPACE
                  valueFrom:
                    fieldRef:
                      fieldPath: metadata.namespace
                ports:
                - containerPort: 8081
                  name: health
                livenessProbe:
                  httpGet:
                    path: /healthz
                    port: 8081
                  initialDelaySeconds: 15
                  periodSeconds: 20
                readinessProbe:
                  httpGet:
                    path: /readyz
                    port: 8081
                  initialDelaySeconds: 5
                  periodSeconds: 10
                resources:
                  requests:
                    cpu: "10m"
                    memory: "64Mi"
                  limits:
                    cpu: "500m"
                    memory: "128Mi"
                securityContext:
                  allowPrivilegeEscalation: false
                  capabilities:
                    drop:
                    - ALL
              securityContext:
                runAsNonRoot: true
              terminationGracePeriodSeconds: 10
    - require:
      - sls: metalk8s.addons.ui-operator.deployed.namespace