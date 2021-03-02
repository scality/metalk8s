Monitoring Stack
================

MetalK8s ships with a monitoring stack that uses charts, counts, and graphs
to provide a cluster-wide view of cluster health, pod status, node status,
and network traffic status.
Access the :ref:`Grafana Service<installation-services-grafana>`
for monitored statistics provided once MetalK8s has been deployed.

The MetalK8s monitoring stack consists of the following main components:

  - :term:`Alertmanager`
  - :term:`Grafana`
  - :term:`Kube-state-metrics`
  - :term:`Prometheus`
  - :term:`Prometheus Node-exporter`

.. todo::

   - For each of the components listed above, provide a detailed description of
     its role within the monitoring stack.
   - Default alerting & recording rules are available as a JSON file. We should
     use this file to generate a corresponding rst table as below.
