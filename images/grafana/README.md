Build grafana image
===================

WHY?
====

After updating prometheus-operator charts to version 8.1.2, the
grafana-piechart-panel is not packaged with the upstream Grafana image and
hence Kubernetes Networking  dashboards cannot display stats.

The best alternative was to contribute upstream, but it seems future releases
of the charts will come with Grafana 6.5.0 with the plugin issue already
solved.

In our best interest to release Metalk8s-2.4.2 with working dashboards,
we resolve to building our own custom Grafana 6.4.2 with the plugin already
installed.

Note:
=====

This custom build will be reverted once the Prometheus-operator charts is
updated some time in future.