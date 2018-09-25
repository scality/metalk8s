.. only:: latex

   Introduction
   ============

MetalK8s_ is an opinionated Kubernetes_ distribution with a focus on long-term
on-prem deployments, launched by Scality_ to deploy its Zenko_ solution in
customer datacenters.

.. _MetalK8s: https://github.com/scality/metalk8s/
.. _Kubernetes: https://kubernetes.io
.. _Scality: https://www.scality.com
.. _Zenko: https://www.zenko.io

It is based on the Kubespray_ project to reliably install a base Kubernetes
cluster, including all dependencies (like etcd_), using the Ansible_
provisioning tool. This installation is further augmented with operational
tools for monitoring and metering, including Prometheus_, Grafana_,
ElasticSearch_ and Kibana_. Furthermore, an "ingress controller" is deployed
by default, based on Nginx_. All of these are managed as Helm_ packages. See
:doc:`/reference-guide/cluster-services` for a whole listing.

.. _Kubespray: https://github.com/kubernetes-incubator/kubespray/
.. _etcd: https://coreos.com/etcd/
.. _Ansible: https://www.ansible.com
.. _Prometheus: https://prometheus.io
.. _Grafana: https://grafana.com
.. _ElasticSearch: https://www.elastic.co/products/elasticsearch/
.. _Kibana: https://www.elastic.co/products/kibana/
.. _Nginx: http://nginx.org
.. _Helm: https://www.helm.sh

Unlike hosted Kubernetes solutions, where network-attached storage is available
and managed by the provider, we assume no such system to be available in
environments where MetalK8s is deployed. As such, we focus on managing
node-local storage, and exposing these volumes to containers managed in the
cluster. See :doc:`/reference-guide/storage` for more information.

.. only:: not latex

   Getting started
   ---------------
   See our :doc:`/installation-guide/quickstart` to deploy a cluster.

   Advanced Configuration
   ----------------------
   Then give a look at :doc:`/operations-guide/advanced_configuration`
