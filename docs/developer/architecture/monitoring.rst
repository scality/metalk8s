Monitoring
==========

Context
-------

In a MetalK8s cluster, almost each component (including applications running
on top of it) generates metrics that allow to monitor its health or expose
internal information.

These metrics can be scrapped and then displayed to the end user in a fashion
way to give him an easily readable overview of the cluster and applications
health and status.

Moreover, the metrics can also be used to send alerts depending on their
values, allowing to quickly see if there is any issue or strange behavior
on a component.

Here, we want to describe the monitoring stack deployed in MetalK8s.

Goals
-----

- Highly available metric history
- Trigger alerts based on metric values
- Visualization of metrics through charts
- Easily scrape new metrics (from new MetalK8s pods or from workload pods
  running on top of MetalK8s)
- Configuration of alert routing and some existing alerts
- Possibility to add extra alerts

Design Design Choices
---------------------

In order to scrape metrics, trigger alerts and visualize metrics history we
decided to use Prometheus, AlertManager and Grafana since it is the
de facto standard for Kubernetes monitoring and is well integrated with
almost any application running on top of Kubernetes.

We use `kube-prometheus <https://github.com/prometheus-operator/kube-prometheus>`__
which embeds the prometheus-operator that deploys the various components but
also allows to easily monitor new metrics, add new Grafana dashboards and
datasources.

.. todo::

  Add explanation about all components part of Prometheus stack and explain how
  each of them interact between them and with the end users (alerts, graphs,
  ...)

But Prometheus does not work as a cluster which means that to have proper HA we
need to duplicate information on several Prometheus instances.

Either each Prometheus instance monitors only a part of all nodes (with some
overlaps in order to have HA), but then to visualize information we need to
reach the right Prometheus instance depending on the node we want to see.

Either each Prometheus instance monitors all nodes, but even in this case
if for whatever reason one Prometheus is down for a short time we will have a
"blank" in the resulting graphs while the information is available in the other
Prometheus instances.

To solve this we decided to use `Thanos <https://github.com/thanos-io/thanos>`__,
so that we have a Thanos side-car on every Prometheus instances and a global
Thanos querier that will query all the Prometheus instances in order to get
metrics asked. And then it will deduplicate series, that come from different
Prometheus instances, by merging all of them in a single time series.
Check `the Thanos querier documentation <https://thanos.io/tip/components/query.md/#global-view>`__
if you want more information about how it works.

Thanos queries are exactly the same as Prometheus ones they both use PromQL.

For the moment we only consider Thanos as a querier and we will not
configure any long term retention, but it's a Thanos capability that can
be interesting in the future.

Rejected Choices
----------------

Federated Prometheus
~~~~~~~~~~~~~~~~~~~~

Prometheus can federate other Prometheus instances, it basically fetches all
metrics from other Prometheus instances instead of getting them directly
from Pod metric endpoints.

It allows to have all metrics available in a single point, with a small
network impact.

This approach was rejected because it means we need to store all metrics in
yet another Prometheus instance and it does not properly scale
if we really want all metrics in this federated Prometheus instance.

Cortex
~~~~~~

`Cortex <https://cortexmetrics.io/>`__ allows to have highly available
metrics history, all Prometheus instances just push all metrics to
Cortex.

Cortex works almost the same way as a Federated Prometheus except that
it runs as a cluster, so it is more scalable since you can have
several Cortex replicas that only own a part of the metrics.
The Cortex Querier will then retrieve the metrics from the right Cortex
instance.

This approach was rejected because it needs a dedicated DB to store the
Cortex hash and it consumes more storage, it is a bit excessive for
a single Kubernetes cluster (which is the intend of MetalK8s) and
Cortex cannot be used as a querier only.

Implementations Details
-----------------------

In order to deploy Thanos Prometheus side-car and deploy the Thanos querier
that interact with those side-cars we need to add new Salt states in
MetalK8s.

Those salt states come from
`Kubernetes Prometheus stack helm chart <https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack>`__
and `Thanos helm chart <https://github.com/banzaicloud/banzai-charts/tree/master/thanos>`__
as described in `the Thanos readme <https://github.com/banzaicloud/banzai-charts/tree/master/thanos#install-prometheus-operator>`__,
then those helm charts are rendered to salt states using the ``render.py``
script from ``charts`` directory.

Thanos will only be used as a querier for the moment so we do not need any
specific configuration for it.

Create a Grafana datasource for Thanos querier and use it for all dashboards
that need to query Prometheus metrics.

Expose Thanos querier through the `metalk8s-ui-proxies-http` Ingress object to
be able to query Prometheus metrics from the MetalK8s UI.

Documentation
-------------

In the Installation Guide:

* Document how to access Grafana

In the Operational Guide:

* Document how this monitoring stack works
* Document what are the default alerts deployed by MetalK8s
* Document how to perform a Prometheus snapshot
* Document how to configure Prometheus through CSC

Test Plan
---------

Add test scenarios for monitoring stack using pytest-bdd framework to
ensure the correct behavior of this feature.

* Ensure that every deployed Pods are properly running after installation
* Ensure that metrics are properly scrapped on every Prometheus instances
* Ensure that alerts are properly raised
* Ensure that we can query metrics from Thanos Querier
