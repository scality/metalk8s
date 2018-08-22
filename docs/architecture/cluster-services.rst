.. spelling::

   Addons
   addons
   operability
   preconfigured
   prometheus
   kube
   Todo

Cluster Services
================
A Kubernetes_ cluster deployed on the `Google Cloud Platform`_ using GKE_, on
`Microsoft Azure`_ using AKS_ or even using Kops_ or similar tools on `Amazon
AWS`_ comes with built-in tooling for centralized container log management,
metrics collection, tracing, node health checking and more.

.. _Kubernetes: https://kubernetes.io
.. _Google Cloud Platform: https://cloud.google.com
.. _GKE: https://cloud.google.com/kubernetes-engine/
.. _Microsoft Azure: https://azure.microsoft.com
.. _AKS: https://docs.microsoft.com/en-us/azure/aks/
.. _Kops: https://github.com/kubernetes/kops/
.. _Amazon AWS: https://aws.amazon.com

In MetalK8s_, we augment a basic Kubernetes cluster deployed using the
Kubespray_ playbook) with various tools to bring an on-premise cluster to the
same level of operability.

.. _MetalK8s: https://github.com/scality/metal-k8s/
.. _Kubespray: https://github.com/kubernetes-incubator/kubespray/

Basic Cluster Addons
--------------------
On top of the basic Kubernetes services, the following addons are deployed:

Helm / Tiller
*************
Helm_ is a *package manager* for Kubernetes. It can be used to deploy various
services in a Kubernetes cluster using templates to describe objects. *Tiller*
is a cluster-side service used by the :command:`helm` CLI tool to manage these
deployments.

.. _Helm: https://www.helm.sh

Heapster
********
Heapster_ is a service which collects and exposes resource consumption metrics
of containers running in a cluster. The Kubernetes Dashboard uses the Heapster
service, when available, to display CPU and memory usage of Pods, Deployments
and more.

.. _Heapster: https://github.com/kubernetes/heapster

metrics-server
**************
The metrics-server_ service is derived from Heapster, and provides an
implementation of the `Metrics API`_ exposing CPU and memory consumption of
containers. These metrics are in turn used by the HorizontalPodAutoscaler_
controller.

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
Metering and monitoring of a MetalK8s cluster is handled by the Prometheus_
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
We use `kube-prometheus`_ to provide operational insight into the Kubernetes
cluster and containers managed by it. This includes predefined alerting rules
and various Grafana dashboards.

`kube-prometheus` uses `prometheus-operator` to deploy all required services.

.. _kube-prometheus: https://github.com/coreos/prometheus-operator/tree/master/contrib/kube-prometheus

node-exporter
*************
The node-exporter_ service is deployed to expose various node OS metrics, which
are in turn captured by Prometheus. These metrics include CPU, memory, disk and
network consumption as well as many Linux-specific values.

.. _node-exporter: https://github.com/prometheus/node_exporter

Grafana
*******
To ease cluster operations, several Grafana dashboards are made available,
including cluster-wide views and health-checks, node OS metrics,
per-*Deployment* or per-*Pod* resource usage, monitoring of the Prometheus
service itself, and many more.

.. todo:: Do we need to list all exported deployed with kube-prometheus?

Log Collection
--------------
ElasticSearch
*************
The ElasticSearch_ full-text indexing service is used to ingest all container
logs in a central place, and make them accessible to operators. This
ElasticSearch cluster is deployed using the `Helm chart`_, with a configuration
tuned for production-grade settings.

.. _ElasticSearch: https://www.elastic.co/products/elasticsearch/
.. _Helm chart: https://github.com/kubernetes/charts/tree/master/incubator/elasticsearch

Cerebro
*******
The Cerebro_ dashboard is a monitoring and administration tool for
Elasticsearch clusters.

.. _Cerebro: https://github.com/lmenezes/cerebro

ElasticSearch Curator
*********************
To ensure ingested logs don't flood the ElasticSearch resources, `ElasticSearch
Curator`_ is deployed with a default configuration which drops `logstash-*`
indices on a given schedule.

.. _ElasticSearch Curator: https://www.elastic.co/guide/en/elasticsearch/client/curator/current/index.html

Fluent Bit and fluentd
**********************
The `Fluent Bit`_ service is deployed as a `DaemonSet`_ to stream all container
logs into `fluentd`_ instances, which collect them and submit batches to
Elasticsearch.

In MetalK8s, Fluent Bit and :program:`fluentd` have a role similar to
`Logstash`_ in the `ELK` stack.

.. _Fluent Bit: https://fluentbit.io
.. _fluentd: https://www.fluentd.org
.. _DaemonSet: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
.. _Logstash: https://www.elastic.co/products/logstash/

Kibana
******
To give operators access to the logs stored in ElasticSearch, a `Kibana`_
instance is provided.

.. note:: When accessing Kibana for the first time, an *index pattern* for the
   ``logstash-*`` indices needs to be configured, using ``@timestamp`` as *Time
   Filter field name*.

.. _Kibana: https://www.elastic.co/products/kibana/
