Advanced guide
==============

.. _multiple CIDR network:

Multiple CIDRs network
----------------------

In the Bootstrap Configuration it's possible to provide several CIDRs for a
single network, it's needed when several nodes does not sit in the same
network.

.. code-block:: yaml

     networks:
       controlPlane:
         cidr:
           - 10.100.1.0/28
           - 10.200.1.0/28
       workloadPlane:
         cidr:
           - 10.100.2.0/28
           - 10.200.2.0/28

This kind of deployment needs good knowledge about networking, as each workload
node needs to be able to communicate with all others, even those in a different
workload CIDR.

In this case :ref:`IP-in-IP encapsulation<enable IP-in-IP>` is likely needed.

Some explanation can be found about this subject in
`Calico documentation <https://docs.projectcalico.org/networking/vxlan-ipip>`_.

.. todo::

  - Explain more what is needed to not need IP-in-IP in that kind of scenario
