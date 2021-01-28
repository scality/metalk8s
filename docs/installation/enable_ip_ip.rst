.. _enable IP-in-IP:

Enable IP-in-IP Encapsulation
=============================

.. _IP-in-IP: https://en.wikipedia.org/wiki/IP_in_IP
.. _Calico: https://docs.projectcalico.org/
.. _IP-in-IP Calico configuration: https://docs.projectcalico.org/v3.7/networking/vxlan-ipip

By default, Calico_ in MetalK8s is configured to use IP-in-IP_ encapsulation
only for cross-subnet communication.

IP-in-IP_ is needed for any network which enforces source and
destination fields of IP packets to correspond to the MAC address(es).

To configure IP-in-IP_ encapsulation for all communications, run
the following command:

.. code-block:: shell

    $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
      patch ippool default-ipv4-ippool --type=merge \
      --patch '{"spec": {"ipipMode": "Always"}}'

For more information refer to `IP-in-IP Calico configuration`_.
