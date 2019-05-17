apiVersion: v1
kind: Pod
metadata:
  name: $name
  namespace: default
  labels:
    app: $name
    app.kubernetes.io/name: $name
  annotations:
    metalk8s.scality.com/config-digest: {{ config_digest }}
spec:
  tolerations:
  - key: "node-role.kubernetes.io/bootstrap"
    operator: "Equal"
    effect: "NoSchedule"
  - key: "node-role.kubernetes.io/infra"
    operator: "Equal"
    effect: "NoSchedule"
  containers:
    - name: $name
      image: $image
      command:
      - sleep
      - "3600"
      volumeMounts:
        - name: config-file
          mountPath: $config_path
  volumes:
    - name: config-file
      hostPath:
        path: $config_path
        type: File
  restartPolicy: Always
