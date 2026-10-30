#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

apiVersion: apps/v1
kind: Deployment
metadata:
  name: backup
  namespace: kube-system
  labels:
    app.kubernetes.io/name: backup
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: backup
  replicas: 1
  template:
    metadata:
      annotations:
        checksum/config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="Secret",
          apiVersion="v1", namespace="kube-system", name="backup-tls", path="data:backup.crt")
        # The nginx configuration is mounted with a subPath, a ConfigMap change
        # only reaches the pod through a rollout
        checksum/nginx-config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="ConfigMap",
          apiVersion="v1", namespace="kube-system", name="backup-nginx-config", path="data:nginx.conf")
      labels:
        app.kubernetes.io/name: backup
        app.kubernetes.io/part-of: metalk8s
        app.kubernetes.io/managed-by: salt
    spec:
      nodeSelector:
        node-role.kubernetes.io/bootstrap: ""
      initContainers:
        - name: generate-htpasswd
          command:
            - htpasswd
            - -bc
            - /htpasswd/.htpasswd
            - $(BACKUP_USERNAME)
            - $(BACKUP_PASSWORD)
          image: {{ build_image_name("metalk8s-utils") }}
          env:
            - name: BACKUP_USERNAME
              valueFrom:
                secretKeyRef:
                  name: backup-credentials
                  key: username
            - name: BACKUP_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: backup-credentials
                  key: password
          volumeMounts:
            - mountPath: /htpasswd
              name: htpasswd
      containers:
        - name: backup
          image: {{ build_image_name("nginx") }}
          ports:
            - name: https
              containerPort: 443
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /livez
              port: https
              scheme: HTTPS
          readinessProbe:
            httpGet:
              path: /livez
              port: https
              scheme: HTTPS
          volumeMounts:
            - name: backups
              mountPath: /backups
            - name: config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
              readOnly: true
            - name: tls
              mountPath: /etc/ssl
            - name: htpasswd
              mountPath: /etc/nginx/htpasswd
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes:
        - name: backups
          hostPath:
            path: /var/lib/metalk8s/backups
            type: DirectoryOrCreate
        - name: config
          configMap:
            name: backup-nginx-config
        - name: tls
          secret:
            defaultMode: 400
            secretName: backup-tls
        - name: htpasswd
          emptyDir: {}
