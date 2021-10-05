#!jinja | metalk8s_kubernetes

apiVersion: v1
kind: Service
metadata:
  name: backup
  namespace: kube-system
  labels:
    app.kubernetes.io/name: backup
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
spec:
  selector:
    app.kubernetes.io/name: backup
  ports:
    - name: https
      protocol: TCP
      port: 443
      targetPort: https
