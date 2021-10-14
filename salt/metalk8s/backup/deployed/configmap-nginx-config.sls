#!jinja | metalk8s_kubernetes

apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-nginx-config
  namespace: kube-system
  labels:
    app.kubernetes.io/name: backup
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
data:
  ssl.conf: |
    server {
        listen              443 ssl;
        server_name         backup;
        ssl_certificate     /etc/ssl/backup.crt;
        ssl_certificate_key /etc/ssl/backup.key;
        ssl_protocols       TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        auth_basic           "Authentication";
        auth_basic_user_file /etc/nginx/htpasswd/.htpasswd;

        location /livez {
            auth_basic off;
            return 200 "I'm alive!";
        }

        location / {
            root      /backups;
            autoindex on;
        }
    }
