MetalK8s Logging
================

System Context
--------------

Logging in MetalK8s is fully managed to make operations as easy as possible.
All logs from application containers and ``systemd`` services are collected,
rotated, and aggregated in a central store.
This store can be queried directly, and can be monitored and explored with
the provided monitoring tools.

.. uml:: ../diagrams/structurizr-LoggingSystemContext.puml


Containers
----------

.. note:: Work in progress - add some text to tell a story

.. uml:: ../diagrams/structurizr-LoggingContainers.puml

Zoom-in on Loki Components
--------------------------

.. note:: Work in progress - add some text to tell a story

.. uml:: ../diagrams/structurizr-LokiComponents.puml
