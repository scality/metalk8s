Bootstrap Installation Errors
=============================

Bootstrap installation fails with no straightforward reason
-----------------------------------------------------------

If during a MetalK8s installation you encounter a failure and the console
output does not provide enough information to identify the cause of
the failure, re-run the installation with the verbose flag (``--verbose``).

.. parsed-literal::

   root@bootstrap $ /srv/scality/metalk8s-|version|/bootstrap.sh --verbose

Errors after restarting the bootstrap node
------------------------------------------

If you reboot the bootstrap node and for some reason some containers
(especially the salt-master container) refuse to start, perform the
following checks:

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
-----------------------------------------------

If during a MetalK8s installation the bootstrap process fails and the console
output is unscrollable, consult the Bootstrap logs in
``/var/log/metalk8s-bootstrap.log``.
