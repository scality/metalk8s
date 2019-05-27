cat << EOF
#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_repo with context %}
EOF

helm template \
        --name nginx-ingress \
        --namespace nginx-ingress-system \
        --values salt/metalk8s/addons/nginx-ingress/values.yaml \
        charts/nginx-ingress | \
        python fix-chart.py metallb-system
