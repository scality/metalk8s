Monitoring Stack
================

MetalK8s ships with a monitoring stack that provides a cluster-wide view of
cluster health, pod status, node status, and network traffic status.

These view points are represented as charts, counts and graphs. For a
closer look, access the :ref:`Grafana Service<installation-services-grafana>`
to get insights on monitoring stats provided once MetalK8s is deployed.

The MetalK8s monitoring stack is composed of the following main components:

  - :term:`Alertmanager`
  - :term:`Grafana`
  - :term:`Kube-state-metrics`
  - :term:`Prometheus`
  - :term:`Prometheus Node-exporter`

.. todo::

   - For each of the components listed above, provide a detailed description of
     its role within the Monitoring stack.
   - Default alerting & recording rules are available as a JSON file, we should
     use this file to generate a corresponding rst table as below
