# Adding new dashboards

- Drop json files into `src` directory
- run `hack/aggregate_dashboard.py`
- Commit new jsonfile under `src` and modification to `files/additionnal_dashboard.yml`

# Current dashboards

[prometheus_2_stats.json](https://github.com/grafana/grafana/blob/master/public/app/plugins/datasource/prometheus/dashboards/prometheus_2_stats.json)
[node-exporter-full.json](https://github.com/rfrail3/grafana-dashboards/blob/master/prometheus/node-exporter-full.json)
[elasticsearch-exporter.json](https://github.com/justwatchcom/elasticsearch_exporter/blob/master/examples/grafana/dashboard.json)
