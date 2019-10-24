.. _enable IP-in-IP:

Enable IP-in-IP encapsulation
=============================

.. _IP-in-IP: https://en.wikipedia.org/wiki/IP_in_IP
.. _Calico: https://docs.projectcalico.org/
.. _IP-in-IP Calico configuration: https://docs.projectcalico.org/v3.7/networking/vxlan-ipip

By default Calico_ in MetalK8s is configured to use IP-in-IP_ encapsulation
only for cross-subnet communication.

To always use IP-in-IP_ encapsulation run the following command:

.. code-block:: shell

    $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
      patch ippool default-ipv4-ippool --type=merge \
      --patch '{"spec": {"ipipMode": "Always"}}'


For more details refer to `IP-in-IP Calico configuration`_.
