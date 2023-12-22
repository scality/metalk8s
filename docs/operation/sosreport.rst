Sosreport
=========

The sosreport tool is installed automatically on all MetalK8s hosts,
and embeds some custom plugins.
It allows to generate a report from a host, including logs, configurations,
containers information, etc.
This report can then be consumed by an operator, or shared with Scality
support, to investigate problems on a platform.

.. _sosreport-generate-report:

Generate A Report
-----------------

To generate a report for a machine, you must have root access.

To include logs and configuration for containerd and MetalK8s components, run:

.. code-block:: console

   root@your-machine # sosreport --batch --all-logs \
       -o metalk8s -kmetalk8s.k8s-resources -kmetalk8s.pod-logs -kmetalk8s.describe -kmetalk8s.metrics \
       -o metalk8s_containerd -kmetalk8s_containerd.all -kmetalk8s_containerd.logs

.. note::

   The archive will include by default the last 24h of logs for all containers,
   this value can be customized with ``-kmetalk8s.last=48h`` for example.

The name of the generated archive is printed in the console output.

Plugins List
------------

To display the full list of available plugins and their options, run:

.. code-block:: shell

   sosreport --list-plugins
