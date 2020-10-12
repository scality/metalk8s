Upgrade a Platform with the latest dev build
============================================

Prerequisites
-------------
- A Platform already installed with all pod up & running
- A new metalk8s.iso image with a higher version

Procedure
---------

If upgrading from a lower patch, minor or major version just follow the
:doc:`standard upgrade procedure </operation/upgrade>`

If upgrading from the same patch, minor and major version:

1. Upload the new metalk8s.iso on the bootstrap node

2. Locate how metalk8s.iso is mounted

  .. parsed-literal::

    grep metalk8s-|version| /etc/fstab
    /root/metalk8s.iso		/srv/scality/metalk8s-|version|	iso9660	nofail,ro	0 0

3. Unmount the current metalk8s.iso

  .. parsed-literal::

    umount /srv/scality/metalk8s-|version|

4. Copy the new metalk8s.iso in place of the old one

  .. parsed-literal::

    cp metalk8s.iso /root/metalk8s.iso

5. Mount the new metalk8s.iso

  .. parsed-literal::

    mount /root/metalk8s.iso /srv/scality/metalk8s-|version|

6. Stop salt-master container on bootstrap node

  .. parsed-literal::

    crictl stop $(crictl ps -q --label io.kubernetes.container.name=salt-master --state Running)

7. Provision the new metalk8s ISO content

  .. parsed-literal::

    /srv/scality/metalk8s-|version|/iso-manager.sh

8. Upgrade the cluster

  .. parsed-literal::

    /srv/scality/metalk8s-|version|-dev/upgrade.sh
