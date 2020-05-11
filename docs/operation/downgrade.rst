Downgrade Guide
***************
Downgrading a MetalK8s cluster is handled via utility scripts which are
packaged with your current installation.
This section describes a reliable downgrade procedure for **MetalK8s**
including all the components that are included in the stack.

Supported Versions
******************
.. note::

    MetalK8 supports downgrade **strictly** from one supported
    minor version to another. For example:

    - Downgrade from 2.1.x to 2.0.x
    - Downgrade from 2.2.x to 2.1.x

    Please refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

Downgrade Pre-requisites
************************
Before proceeding with the downgrade procedure, make sure to complete the
pre-requisites listed in :doc:`/operation/preparation`.

Run pre-check
-------------
You can test if your environment will successfully downgrade with the following
command.
This will simulate the downgrade prechecks and provide an overview of the
changes to be carried out in your MetalK8s cluster.

.. important::

    The version prefix metalk8s-**X.X.X** as used below during a MetalK8s
    downgrade must be the currently-installed MetalKs8 version.

   .. code::

     /srv/scality/metalk8s-X.X.X/downgrade.sh --destination-version \
       <destination_version> --dry-run --verbose

Downgrade Steps
***************
Ensure that the downgrade pre-requisites above have been met before you make
any step further.

Saltstack downgrade (only needed for 2.4.0, 2.4.1, 2.4.2, 2.4.3, or 2.5.0)
--------------------------------------------------------------------------

When downgrading MetalK8s to ``2.4.0``, ``2.4.1``, ``2.4.2``, ``2.4.3``, or
``2.5.0`` you first need to downgrade Salt minions manually, if you downgrade
to another version then you can skip this section.

.. warning::

  MetalK8s ``2.4.0``, ``2.4.1``, ``2.4.2``, ``2.4.3``, and ``2.5.0`` use Salt
  version 2018.3.4 that has two known dangerous CVE
  (`CVE-2020-11651 <https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-11651>`_,
  `CVE-2020-11652 <https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-11652>`_)
  , downgrade to these versions only if it's mandatory.

#. Go inside the Salt-master container

   .. code::

     kubectl --kubeconfig=/etc/kubernetes/admin.conf exec -it \
         $(kubectl --kubeconfig=/etc/kubernetes/admin.conf get pods \
             --namespace kube-system \
             --selector "app.kubernetes.io/name=salt-master" \
             --field-selector=status.phase=Running \
             --output jsonpath='{.items[*].metadata.name}') \
         --namespace kube-system -c salt-master -- bash

#. Sync all Salt modules to MetalK8s destination version

   .. code::

     salt '*' saltutil.sync_all saltenv=metalk8s-<version>

#. Configure repositories to make packages available

   .. code::

     salt '*' state.sls metalk8s.repo saltenv=metalk8s-<version>

#. Downgrade Salt minions

   .. code::

     salt '*' state.single pkg.installed salt \
         pkgs="[{'salt-minion': '2018.3.4'}, {'salt': '2018.3.4'}]" \
         hold=True update_holds=True --timeout=200

#. Check that every Salt minions run with `2018.3.4`

   .. note::

     Master downgrade is handled by the utility script in the next section

   .. code::

     salt-run manage.versions

#. Leave the Salt-master container

   .. code::

     exit

MetalK8s downgrade
------------------

To downgrade a MetalK8s cluster, run the utility script shipped
with the **current** installation providing it with the destination version:

.. important::

    The version prefix metalk8s-**X.X.X** as used below during a MetalK8s
    downgrade must be the currently-installed MetalKs8 version.

- From the :term:`Bootstrap node`, launch the downgrade.

   .. code::

     /srv/scality/metalk8s-X.X.X/downgrade.sh --destination-version <version>

