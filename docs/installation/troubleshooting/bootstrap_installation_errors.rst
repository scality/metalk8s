Bootstrap Installation Errors
=============================

Bootstrap installation fails for no obvious reason
""""""""""""""""""""""""""""""""""""""""""""""""""

If the Metalk8s installation fails and the console output does not provide
enough information to identify the cause of the failure, re-run the
installation with the verbose flag (``--verbose``).

.. parsed-literal::

   root@bootstrap $ /srv/scality/metalk8s-|version|/bootstrap.sh --verbose

Errors after restarting the bootstrap node
""""""""""""""""""""""""""""""""""""""""""

If you reboot the bootstrap node and some containers (especially the
salt-master container) do not start, perform the following checks:

#. Ensure that the MetalK8s ISO is mounted properly.

   .. parsed-literal::

      [root@bootstrap vagrant]# mount | grep /srv/scality/metalk8s-|version|
      /home/centos/metalk8s.iso on /srv/scality/metalk8s-|version| type iso9660 (ro,relatime)

#. If the ISO is unmounted, run the following command to check the
   the status of the ISO file and remount it automatically.

   .. parsed-literal::

      [root@bootstrap vagrant]# salt-call state.sls metalk8s.archives.mounted saltenv=metalk8s-|version|
       Summary for local
       ------------
       Succeeded: 3
       Failed:    0

Bootstrap fails and console log is unscrollable
"""""""""""""""""""""""""""""""""""""""""""""""

If the bootstrap process fails during MetalK8s installation and the console
output is unscrollable, consult the bootstrap logs in
``/var/log/metalk8s/bootstrap.log``.

Bootstrap fails with "Invalid networks:service CIDR - no route exists"
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

This error happens if there is no route matching this network CIDR and no
default route configured.

You can solve this issue by either adding a default route to your host or
adding a dummy network interface used to define a route for this network.

Configuring a default route:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To configure a default route, refer to the official documentation of your
Linux distribution.

Configuring a dummy interface:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**CentOS / RHEL 7**

Create the ``dummy-metalk8s`` interface configuration:

  .. code-block:: shell

     cat > /etc/sysconfig/network-scripts/ifcfg-dummy-metalk8s << 'EOF'
     ONBOOT=yes
     DEVICE=dummy
     NM_CONTROLLED=no
     NAME=dummy-metalk8s
     EOF

Create the ``ifup-dummy`` network script:

  .. code-block:: shell

     cat > /etc/sysconfig/network-scripts/ifup-dummy << 'EOF'
     #!/bin/sh
     # Network configuration file for dummy network interface

     . /etc/init.d/functions

     cd /etc/sysconfig/network-scripts
     . ./network-functions

     [ -f ../network ] && . ../network

     CONFIG=${1}

     need_config "${CONFIG}"
     source_config

     modprobe --first-time ${DEVICETYPE} numdummies=0 2> /dev/null || echo dummy module already loaded
     ip link add ${DEVNAME} type ${DEVICETYPE}
     [[ -n "${IPADDR}" && -n "${NETMASK}" ]] && ip address add ${IPADDR}/${NETMASK} dev ${DEVNAME}
     ip link set ${DEVNAME} up
     /etc/sysconfig/network-scripts/ifup-routes ${DEVICE} ${NAME}
     EOF

     chmod +x /etc/sysconfig/network-scripts/ifup-dummy

Create the ``ifdown-dummy`` network script:

  .. code-block:: shell

     cat > /etc/sysconfig/network-scripts/ifdown-dummy << 'EOF'
     #!/bin/sh
     . /etc/init.d/functions

     cd /etc/sysconfig/network-scripts
     . ./network-functions

     [ -f ../network ] && . ../network

     CONFIG=${1}

     need_config "${CONFIG}"

     source_config

     ip link set ${DEVNAME} down
     ip link del ${DEVNAME} type ${DEVICETYPE}
     EOF

     chmod +x /etc/sysconfig/network-scripts/ifdown-dummy

Create the ``route-dummy-metalk8s`` network script:

  .. code-block:: shell

     cat > /etc/sysconfig/network-scripts/route-dummy-metalk8s << EOF
     $(salt-call --local pillar.get networks:service --out=txt | cut -d' ' -f2-) dev dummy-metalk8s
     EOF

Start the ``dummy-metalk8s`` interface:

  .. code-block:: shell

     ifup dummy-metalk8s

**CentOS / RHEL 8 (and other NetworkManager based dists)**

Retrieve the service network CIDR:

  .. code-block:: shell

     salt-call --local pillar.get networks:service --out=txt | cut -d' ' -f2-

Create the ``dummy-metalk8s`` interface:

  .. code-block:: shell

     nmcli connection add type dummy ifname dummy-metalk8s ipv4.method manual ipv4.addresses <dummy-iface-ip> ipv4.routes <network-cidr>

  .. note::

     Replace ``<dummy-iface-ip>`` by any available IP in the previously
     retrieved network CIDR (e.g. 10.96.10.96 for a 10.96.0.0/12 network CIDR)
     and <network-cidr> by the network CIDR.

Start the ``dummy-metalk8s`` interface:

  .. code-block:: shell

     nmcli connection up dummy-dummy-metalk8s
