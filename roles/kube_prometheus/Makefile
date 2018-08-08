DASHBOARDS = \
	files/additional-dashboards/kube-prometheus-etcd-dashboard.yml \
	files/additional-dashboards/kube-prometheus-elasticsearch-dashboard.yml \
	files/additional-dashboards/kube-prometheus-node-exporter-dashboard.yml \
	files/additional-dashboards/kube-prometheus-prometheus-dashboard.yml \
	files/additional-dashboards/kube-prometheus-calico-dashboard.yml \
	files/additional-dashboards/kube-prometheus-calico2-dashboard.yml \
	files/additional-dashboards/kube-prometheus-nginx-ingress-dashboard.yml

all: $(DASHBOARDS)
.PHONY: all

clean:
	rm -f $(DASHBOARDS)
.PHONY: clean

files/additional-dashboards/kube-prometheus-etcd-dashboard.yml: ../../vendor/etcd/Documentation/op-guide/grafana.json
files/additional-dashboards/kube-prometheus-etcd-dashboard.yml: TAGS=etcd,cluster

files/additional-dashboards/kube-prometheus-elasticsearch-dashboard.yml: ../../vendor/justwatchcom/elasticsearch_exporter/examples/grafana/dashboard.json
files/additional-dashboards/kube-prometheus-elasticsearch-dashboard.yml: TITLE=Elasticsearch
files/additional-dashboards/kube-prometheus-elasticsearch-dashboard.yml: TAGS=elasticsearch,logging

files/additional-dashboards/kube-prometheus-node-exporter-dashboard.yml: ../../vendor/rfrail3/grafana-dashboards/prometheus/node-exporter-full-old.json
files/additional-dashboards/kube-prometheus-node-exporter-dashboard.yml: TITLE=Nodes (Detailed)
files/additional-dashboards/kube-prometheus-node-exporter-dashboard.yml: TAGS=nodes,cluster

files/additional-dashboards/kube-prometheus-prometheus-dashboard.yml: ../../vendor/grafana/grafana/public/app/plugins/datasource/prometheus/dashboards/prometheus_2_stats.json
files/additional-dashboards/kube-prometheus-prometheus-dashboard.yml: TAGS=prometheus,metrics

files/additional-dashboards/kube-prometheus-calico-dashboard.yml: ../../vendor/grafana-dashboards/3244/revisions/1/download
files/additional-dashboards/kube-prometheus-calico-dashboard.yml: TAGS=calico,cluster,networking

files/additional-dashboards/kube-prometheus-calico2-dashboard.yml: ../../vendor/zihaoyu/calico/667584956586c0b869d6ad9573ff8312efa265f1/master/reference/felix/grafana-dashboard.json
files/additional-dashboards/kube-prometheus-calico2-dashboard.yml: TITLE=Kubernetes Calico (Alternative)
files/additional-dashboards/kube-prometheus-calico2-dashboard.yml: TAGS=calico,cluster,networking

files/additional-dashboards/kube-prometheus-nginx-ingress-dashboard.yml: ../../vendor/kubernetes/ingress-nginx/deploy/grafana/dashboards/nginx.yaml
files/additional-dashboards/kube-prometheus-nginx-ingress-dashboard.yml: TAGS=nginx,cluster,networking

files/additional-dashboards/%.yml: hack/fix-dashboard.py Makefile
	@mkdir -p files/additional-dashboards
	env TAGS="$(TAGS)" TITLE="$(TITLE)" FILENAME="$(shell basename $@)" python hack/fix-dashboard.py < $(word 3,$^) > $@.tmp || rm -f $@.tmp
	mv $@.tmp $@
