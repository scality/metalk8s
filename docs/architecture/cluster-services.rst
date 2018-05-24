.. spelling::

   operability
   preconfigured
   prometheus
   kube
   Todo

Cluster Services
================
Platform-native Kubernetes engines like GKE_, AKS, or Kops (or similar) 
ensure that Kubernetes_ clusters deployed their native cloud platforms
(GCP_, Azure_, or AWS_, respectively) come with built-in tooling for
centralized container log management, metrics collection, tracing, node
health checking, and more.

.. _Kubernetes: https://kubernetes.io
.. _Google Cloud Platform: https://cloud.google.com
.. _GKE: https://cloud.google.com/kubernetes-engine/
.. _Microsoft Azure: https://azure.microsoft.com
.. _AKS: https://docs.microsoft.com/en-us/azure/aks/
.. _Kops: https://github.com/kubernetes/kops/
.. _Amazon AWS: https://aws.amazon.com

MetalK8s_ augments a basic Kubernetes cluster deployed using the
Kubespray_ playbook with tools that bring an on-premise cluster to
the same level of operability.

.. _MetalK8s: https://github.com/scality/metal-k8s/
.. _Kubespray: https://github.com/kubernetes-incubator/kubespray/

Basic Cluster Add-ons
--------------------
The following add-ons are deployed along with the basic Kubernetes services:

Helm / Tiller
*************
Helm_ is a *package manager* for Kubernetes that can deploy various services
in a Kubernetes cluster using templates to describe objects. *Tiller* is a 
cluster-side service the :command:`helm` CLI tool uses to manage these
deployments.

.. _Helm: https://www.helm.sh

Heapster
********
Heapster_ is a service that collects and exposes resource consumption metrics
of containers running in a cluster. When the Heapster service is available, the
Kubernetes Dashboard uses it to display CPU and memory usage of Pods,
Deployments, and more.

.. _Heapster: https://github.com/kubernetes/heapster

metrics-server
**************
Derived from Heapster, the metrics-server_ service provides an implementation
of the `Metrics API`_ exposing containers' CPU and memory consumption. These
metrics are in turn used by the HorizontalPodAutoscaler_ controller.

.. _metrics-server: https://github.com/kubernetes-incubator/metrics-server
.. _Metrics API: https://github.com/kubernetes/community/blob/master/contributors/design-proposals/instrumentation/resource-metrics-api.md
.. _HorizontalPodAutoscaler: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

Ingress Controller
------------------
To expose Services_ to the outside world using an Ingress_ object, Kubernetes
requires an `Ingress Controller`_ to be running in the cluster. For this
purpose, MetalK8s deploys the nginx-ingress-controller_, which uses the
well-known Nginx_ HTTP server under the hood.

.. _Services: https://kubernetes.io/docs/concepts/services-networking/service/
.. _Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
.. _Ingress Controller: https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-controllers
.. _nginx-ingress-controller: https://github.com/kubernetes/ingress-nginx
.. _Nginx: http://nginx.org

Metering / Monitoring
---------------------
Metering and monitoring a MetalK8s cluster is handled by the Prometheus_
stack, including the Prometheus TSDB for metrics storage, Alertmanager_ to send
alerts when preconfigured conditions are (not) met, and Grafana_ to visualize
stored metrics using predefined dashboards.

.. _Prometheus: https://prometheus.io
.. _Alertmanager: https://prometheus.io/docs/alerting/alertmanager/
.. _Grafana: https://grafana.com

prometheus-operator
*******************
The CoreOS_ `Prometheus Operator`_ is deployed in the cluster to manage
Prometheus instances, scrape targets and alerting rules.

.. _CoreOS: https://coreos.com
.. _Prometheus Operator: https://coreos.com/operators/prometheus/

kube-prometheus
***************
`kube-prometheus`_ provides operational insight into the Kubernetes cluster
and the containers it manages. This includes predefined alerting rules and
various Grafana dashboards.

`kube-prometheus` uses `prometheus-operator` to deploy all required services.

.. _kube-prometheus: https://github.com/coreos/prometheus-operator/tree/master/contrib/kube-prometheus

node-exporter
*************
The node-exporter_ service exposes various node OS metrics, which Prometheus
captures in turn. These metrics include consumption of CPU, memory, disk,
and network resources, as well as many Linux-specific values.

.. _node-exporter: https://github.com/prometheus/node_exporter

Grafana
*******
To ease cluster operations, several Grafana dashboards are offered,
providing cluster-wide views and health checks, node OS metrics,
per-*Deployment* and per-*Pod* resource usage, monitoring of the Prometheus
service itself, and many more.

.. todo:: Do we need to list all exported deployed with kube-prometheus?

Log Collection
--------------
ElasticSearch
*************
The Elasticsearch_ full-text indexing service ingests all container
logs in a central place and makes them accessible to operators. This
Elasticsearch cluster is deployed using the manifests provided in
`pires/kubernetes-elasticsearch-cluster`_, which are tuned to use
production-grade settings.

.. _Elasticsearch: https://www.elastic.co/products/elasticsearch/
.. _pires/kubernetes-elasticsearch-cluster:

Elasticsearch Curator
*********************
To ensure ingested logs don't flood the Elasticsearch resources,
`Elasticsearch Curator`_ is deployed with a default configuration
that drops `logstash-*` indexes on a given schedule.

.. _ElasticSearch Curator: https://www.elastic.co/guide/en/elasticsearch/client/curator/current/index.html

fluentd
*******
The `fluentd`_ service is deployed as a `DaemonSet`_ to stream all container
logs into ElasticSearch.

In MetalK8s, :program:`fluentd` has a role similar to `Logstash`_ in the `ELK`
stack.

.. _fluentd: https://www.fluentd.org
.. _DaemonSet: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
.. _Logstash: https://www.elastic.co/products/logstash/

Kibana
******
To give operators access to the logs stored in Elasticsearch, a `Kibana`_
instance is provided.

.. note:: When Kibana is first accessed, an *index pattern* for the
   ``logstash-*`` indexes must be configured, using ``@timestamp`` as *Time
   Filter field name*.

.. _Kibana: https://www.elastic.co/products/kibana/
