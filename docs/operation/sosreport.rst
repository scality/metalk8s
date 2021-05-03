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
       -o metalk8s -kmetalk8s.all=True -kmetalk8s.podlogs=True -kmetalk8s.describe=True \
       -o containerd -kcontainerd.all=True -kcontainerd.logs=True

The name of the generated archive is printed in the console output.

Plugins List
------------

To display the full list of available plugins and their options, run:

.. code-block:: shell

   sosreport --list-plugins
