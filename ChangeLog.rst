.. The structure of this document is based on https://github.com/sphinx-doc/sphinx/blob/master/CHANGES

Release 1.1.0 (in development)
==============================
Features added
--------------
:ghpull:`222` - update Elasticsearch and `node_exporter` dashboards

:ghpull:`225` - Figure out the "fail fast" option of ansible (:ghissue:`129`)

:ghpull:`280` - add an Ansible module to handle Helm chart installation (:ghissue:`190`)

:ghpull:`309` - introduce variables to control helm behaviour. New 'wait' option

:ghpull:`291` - add external values for nginx_ingress

Bugs Fixed
----------
:ghissue:`224` - variabilize the Kibana index pattern and service name in
the index provisioning job (:ghpull:`233`).

:ghpull:`251` - tag Grafana dashboards (:ghissue:`208`)

Release 1.0.1 (in development)
==============================
Features added
--------------
:ghpull:`240` - update Python `cryptography` package to 2.3

:ghpull:`274` - add support for python3.7

:ghpull:`305` - ensure that journald logs are persisted across reboot (:ghissue:`303`)

Bugs fixed
----------
:ghissue:`50` - raise default `etcd` memory limits (:ghpull:`331`)

:ghissue:`237` - increase timeout of `prometheus-operator` deployment
(:ghpull:`244`)

:ghissue:`321` - retry until PV creation succeeds in `reclaim-storage` playbook (:ghpull:`319`)

Release 1.0.0
=============
This marks the first production-ready release of `MetalK8s`_. Deployments using
this release can be upgraded to later MetalK8s 1.x versions.

Breaking changes
----------------
:ghpull:`187` - no longer remove the MetalK8s 0.1.x Elasticsearch cluster upon
upgrade (:ghissue:`160`)

Features added
--------------
:ghpull:`191` - deploy `PodDisruptionBudgets` for Elasticsearch
(:ghissue:`157`)

:ghpull:`193` - update versions of `kube-prometheus`, Elasticsearch and
Kubespray

:ghpull:`181` - format `PersistentVolumes` asynchronously (:ghissue:`173`)

:ghpull:`201` - collect Calico metrics and deploy Grafana dashboards for them
(:ghissue:`81`)

:ghpull:`210` - deploy `metrics-server` using Helm (:ghissue:`146`)

:ghpull:`189`, :ghpull:`215` - collect `nginx-ingress` metrics and deploy a dashboard (:ghissue:`143`)

:ghpull:`218` - update versions of Kibana and `fluent-bit`

:ghpull:`223` - pre-provision Kibana index configuration (:ghissue:`174`)

Bugs fixed
----------
:ghissue:`170` - rename `ElasticSearch Example` and `Node Exporter Full` Grafana
dashboards (:ghpull:`188`)

:ghissue:`196` - deploy the Elasticsearch Curator configuration we want to
deploy instead of falling back to the chart default (:ghpull:`197`)

:ghissue:`220` - 'Kubernetes Calico (Alternative)' dashboard doesn't work (:ghpull:`221`)


Known issues
------------
:ghissue:`179` - some Grafana dashboard charts are not displaying any metrics


Release 0.2.0
=============
.. note:: Compatibility with future releases of MetalK8s is not guaranteed until
   version 1.0.0 is available. When deploying a cluster using pre-1.0 versions
   of this package, you may need to redeploy later.

Breaking changes
----------------
:ghpull:`159` - use upstream chart for Elasticsearch. Historical log data will
be lost. Please see the pull-request description for manual steps required after
upgrading a MetalK8s 0.1 cluster to MetalK8s 0.2 (:ghissue:`147`)

:ghpull:`94` - flatten the storage configuration and allow more user defined
storage related actions. Please see :ref:`upgrade_from_MetalK8s_before_0.2.0`
(:ghissue:`153`)


Features added
--------------
:ghpull:`144` - update Kibana chart version

:ghpull:`145` - update the Cerebro chart, and pre-configure the MetalK8s
Elasticsearch cluster

:ghpull:`154` - rework log collection architecture, now using `Fluent Bit`_ to
capture logs, then forward to `fluentd`_ to aggregate them and batch-insert in
Elasticsearch (:ghissue:`51`)

.. _Fluent Bit: https://fluentbit.io
.. _fluentd: https://www.fluentd.org

:ghpull:`163` - update versions of Elasticsearch Exporter, `nginx-ingress`,
`kube-prometheus` and Kubespray

Bugs fixed
----------
:ghpull:`151` - fix `debug` clause `var` scoping

:ghissue:`150` - fix deployment of Elasticsearch, node and Prometheus Grafana dashboards (:ghpull:`158`)

:ghissue:`139` - stabilize :command:`helm init` (:ghpull:`167`)

Known issues
------------
:ghissue:`179` - some Grafana dashboard charts are not displaying any metrics


Release 0.1.1
=============
.. note:: Compatibility with future releases of MetalK8s is not guaranteed until
   version 1.0.0 is available. When deploying a cluster using pre-1.0 versions
   of this package, you may need to redeploy later.

Features added
--------------
:ghpull:`11` - run the OpenStack `ansible-hardening`_ role on nodes to apply
security hardening configurations from the
`Security Technical Implementation Guide (STIG)`_ (:ghissue:`88`)

.. _ansible-hardening: https://github.com/openstack/ansible-hardening
.. _Security Technical Implementation Guide (STIG): http://iase.disa.mil/stigs/Pages/index.aspx

:ghpull:`127` - deploy Cerebro_ to manage the Elasticsearch cluster
(:ghissue:`126`)

.. _Cerebro: https://github.com/lmenezes/cerebro

:ghpull:`138` - update versions of Fluentd_, Kibana_, `Elasticsearch Exporter`_
and Kubespray_

.. _Fluentd: https://www.fluentd.org
.. _Kibana: https://www.elastic.co/products/kibana
.. _Elasticsearch Exporter: https://github.com/justwatchcom/elasticsearch_exporter
.. _Kubespray: https://github.com/kubernetes-incubator/kubespray/

:ghpull:`140` - set up kube-prometheus_ to monitor CoreDNS_ (cfr. :ghpull:`104`)

.. _kube-prometheus: https://github.com/coreos/prometheus-operator/tree/master/contrib/kube-prometheus
.. _CoreDNS: https://coredns.io/

Bugs fixed
----------
:ghissue:`103` - set up host anti-affinity for Elasticsearch service scheduling
(:ghpull:`113`)

:ghissue:`120` - required facts not gathered when running the `services`
playbook in isolation (:ghpull:`132`)

:ghpull:`134` - fix `bash-completion` in the MetalK8s Docker image

Release 0.1.0
=============
This marks the first release of `MetalK8s`_.

.. note:: Compatibility with future releases of MetalK8s is not guaranteed until
   version 1.0.0 is available. When deploying a cluster using pre-1.0 versions
   of this package, you may need to redeploy later.

.. _MetalK8s: https://github.com/Scality/metal-k8s

Incompatible changes
--------------------
:ghpull:`106` - the Ansible playbook which used to be called
:file:`metal-k8s.yml` has been moved to :file:`playbooks/deploy.yml`

Features added
--------------
:ghpull:`100` - disable Elasticsearch deployment by setting
`metalk8s_elasticsearch_enabled` to `false` (:ghissue:`98`)

:ghpull:`104` - `kube-proxy` now uses `ipvs` instead of `iptables` to route
*Service* addresses, in preparation for Kubernetes 1.11. The `ipvsadm` tool is
installed on all `k8s-cluster` hosts.

:ghpull:`104` - use CoreDNS instead of kubedns for in-cluster DNS services, in
preparation for Kubernetes 1.11.

:ghpull:`113` - deploy the Prometheus `node_exporter` on `k8s-cluster` and
`etcd` hosts instead of using a *DaemonSet*

Known issues
------------
:ghissue:`62` - Elasticsearch Curator may not properly prune old `logstash-*`
indices
