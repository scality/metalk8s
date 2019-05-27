cat << EOF
#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_repo with context %}
EOF

helm template \
        --name metallb \
        --namespace metallb-system \
        --values salt/metalk8s/addons/metallb/values.yaml \
        charts/metallb | \
        python fix-chart.py metallb-system
