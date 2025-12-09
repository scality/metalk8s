Alerts
======

MetalK8s monitoring stack can generate alerts from observed statistics and a
set of rules. These alerts are then persisted for providing a historical view
in MetalK8s UI, and can be routed to custom receivers if needed (see
:ref:`csc-alertmanager-customization` for how to do this).

Predefined Alerting Rules
-------------------------

There are two categories of alerting rules deployed with MetalK8s: *simple* and
*composite*.

Simple alerting rules define an expression only from "standard" Prometheus
metrics, while composite rules rely on the special ``ALERTS`` metric to
generate alerts from the state of other alerts.

Composite rules are used to build a hierarchy of alerts, encoding the
relationship between low-level components and their simple alerting rules into
higher level services.

Hierarchy
^^^^^^^^^

.. jinja:: alerting
   :file: _jinja/alerting/alert-tree.rst.j2
   :header_char: "

Composite Rules
^^^^^^^^^^^^^^^

.. jinja:: alerting
   :file: _jinja/alerting/composite-rulelist.rst.j2
   :header_char: "

Simple Rules
^^^^^^^^^^^^

.. jinja:: alerting
   :file: _jinja/alerting/simple-rulelist.rst.j2
   :header_char: "

Excluding PersistentVolumeClaims from Storage Alerts
-----------------------------------------------------

MetalK8s monitors PersistentVolumeClaim (PVC) storage usage and generates
alerts when volumes are filling up. To exclude specific PVCs from these
storage-related alerts (such as ``KubePersistentVolumeFillingUp`` and
``KubePersistentVolumeInodesFillingUp``), add the ``excluded-from-alerts``
label with the value ``"true"`` to the PVC.

.. code-block:: yaml

   ---
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: <pvc-name>
     namespace: <namespace-name>
     labels:
       excluded-from-alerts: "true"
   spec:
     # ... PVC specification ...

To add this label to an existing PVC:

.. code-block:: shell

    root@bootstrap $ kubectl --kubeconfig=/etc/kubernetes/admin.conf \
                       label pvc <pvc-name> -n <namespace-name> \
                       excluded-from-alerts=true

.. note::

   This feature is particularly useful for data disks that are expected to
   be nearly full or for volumes where storage alerts are managed by
   application-specific monitoring.
