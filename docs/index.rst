.. spelling::

   prem

.. MetalK8s documentation master file, created by
   sphinx-quickstart on Thu Apr 26 18:12:47 2018.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome to the MetalK8s documentation!
======================================
MetalK8s_ is an opinionated Kubernetes_ distribution with a focus on long-term
on-prem deployments, launched by Scality_ to deploy its Zenko_ solution in
customer datacenters.

.. _MetalK8s: https://github.com/scality/metal-k8s/
.. _Kubernetes: https://kubernetes.io
.. _Scality: https://www.scality.com
.. _Zenko: https://www.zenko.io

It is based on the Kubespray_ project to reliably install a Kubernetes-based
cluster, including all dependencies (like etcd_), using the Ansible_
provisioning tool. This installation is also augmented with operational
tools for monitoring and metering, including Prometheus_, Grafana_,
ElasticSearch_ and Kibana_. Furthermore, an "ingress controller" is deployed
by default, based on Nginx_. All of these are managed as Helm_ packages. See
:doc:`architecture/cluster-services` for a whole listing.

.. _Kubespray: https://github.com/kubernetes-incubator/kubespray/
.. _etcd: https://coreos.com/etcd/
.. _Ansible: https://www.ansible.com
.. _Prometheus: https://prometheus.io
.. _Grafana: https://grafana.com
.. _ElasticSearch: https://www.elastic.co/products/elasticsearch/
.. _Kibana: https://www.elastic.co/products/kibana/
.. _Nginx: http://nginx.org
.. _Helm: https://www.helm.sh

Unlike hosted Kubernetes solutions, network-attached storage is available
and managed by the provider, we assume no such system to be available in
environments where MetalK8s is deployed. As such, we focus on managing
node-local storage, and exposing these volumes to containers managed in the
cluster. See :doc:`architecture/storage` for more information.

Getting started
---------------
See our :doc:`usage/quickstart` to deploy a cluster.

Advanced Configuration
----------------------
Then refer to :doc:`usage/advanced_configuration`.

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   usage/quickstart
   usage/advanced_configuration
   architecture/index

   faq

   changes

   glossary

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
