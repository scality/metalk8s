Prometheus
==========

In a MetalK8s cluster, the Prometheus service records real-time metrics in a
time series database. Prometheus can query a list of data sources called
"exporters" at a specific polling frequency, and aggregate this data across the
various sources.

Prometheus uses a special language, Prometheus Query Language (PromQL),
to write alerting and recording rules.

Snapshot Prometheus Database
----------------------------

To snapshot the database, you must first
:ref:`enable the Prometheus admin API<csc-enable-prometheus-admin-api>`.

To generate a snapshot, use the
:ref:`sosreport utility<sosreport-generate-report>` with the following options:

.. code-block:: console

   root@host # sosreport --batch --build -o metalk8s -kmetalk8s.prometheus-snapshot=True

The name of the generated archive is printed on the console output and
the Prometheus snapshot can be found under ``prometheus_snapshot`` directory.

.. warning::

   You must ensure you have sufficient disk space (at least the size
   of the Prometheus volume) under ``/var/tmp`` or change the archive
   destination with ``--tmp-dir=<new_dest>`` option.
