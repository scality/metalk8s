#!jinja | metalk8s_kubernetes

{%- set object = salt.metalk8s_kubernetes.get_object(
    kind="Secret",
    apiVersion="v1",
    name="backup-credentials",
    namespace="kube-system",
) %}

{%- if object %}
  {%- set username = salt.hashutil.base64_b64decode(object["data"]["username"]) %}
  {%- set password = salt.hashutil.base64_b64decode(object["data"]["password"]) %}
{%- else %}
  {%- set username = "backup" %}
  {%- set password = salt.random.get_str(length=30, punctuation=false) %}
{%- endif %}

apiVersion: v1
kind: Secret
metadata:
  name: backup-credentials
  namespace: kube-system
  labels:
    app.kubernetes.io/name: backup
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/managed-by: salt
type: kubernetes.io/basic-auth
stringData:
  username: {{ username }}
  password: {{ password }}
