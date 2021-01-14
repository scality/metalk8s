Using the ``metalk8s-utils`` Image
==================================
A MetalK8s installation comes with a container image called ``metalk8s-utils``
in the embedded registry. This image contains several tools an operator can use
to analyze a cluster environment or troubleshoot various system issues.

The image can be used to create a *Pod* on a node, after which a shell inside
the container can be created to run the various utilities. Depending on the
use-case, the *Pod* could be created using the host network namespace, the host
PID namespace, elevated privileges, mounting host directories as volumes, etc.

See the ``metalk8s-utils``
:download:`Dockerfile <../../images/metalk8s-utils/Dockerfile>` for a list of
all packages installed in the image.

A Simple Shell
--------------
To run a ``metalk8s-utils`` container as a simple shell, execute the following
command:

.. parsed-literal::

    kubectl run shell \\
        --image=metalk8s-registry-from-config.invalid/metalk8s-|version|/metalk8s-utils:|version| \\
        --restart=Never \\
        --attach \\
        --stdin \\
        --tty \\
        --rm

This will create a *Pod* called ``shell`` with a container running the
``metalk8s-utils`` image, and present you with a shell in this container.

.. note::

   This procedure expects no other ``shell`` *Pod* to be running. Adjust the
   name accordingly, or use a dedicated namespace if conflicts occur.

A Long-Running Container
------------------------
In the example above, the lifetime of the container is tied to the invocation
of ``kubectl run``. In some situations it's more efficient to keep such
container running and attach to it (and detach from it) dynamically.

* Create the *Pod*:

.. parsed-literal::

    kubectl run shell \\
        --image=metalk8s-registry-from-config.invalid/metalk8s-|version|/metalk8s-utils:|version| \\
        --restart=Never \\
        --command -- sleep infinity

This creates the ``shell`` *Pod* including a ``metalk8s-utils`` container
running ``sleep infinity``, effectivelly causing the *Pod* to remain alive
until deleted.

* Get a shell in the container::

    kubectl exec -ti shell -- bash

.. note::

   The :program:`screen` and :program:`tmux` utilities are installed in the
   image for terminal multiplexing.

* Exit the shell to detach

* Remove the *Pod* once the container is no longer needed::

    kubectl delete pod shell

A Shell on a Particular Node
----------------------------
To pin the *Pod* in which the ``metalk8s-utils`` container is launched to a
particular node, add the following options to a suitable ``kubectl run``
invocation::

    --overrides='{ "apiVersion": "v1", "spec": { "nodeName": "NODE_NAME" } }'

.. note::

   In the above, replace ``NODE_NAME`` by the desired node name.

A Shell in the Host Network Namespace
-------------------------------------
To run a ``metalk8s-utils`` container in the host network namespace, e.g.,
to use utilities such as ``ip``, ``iperf`` or ``tcpdump`` as if they're
executed on the host, add the following options to a suitable
``kubectl run`` invocation::

    --overrides='{ "apiVersion": "v1", "spec": { "hostNetwork": true } }'

.. note::

   If multiple ``overrides`` need to be combined, the JSON objects must be
   merged.

.. todo::

   - Adding tolerations for various taints when using `nodeName`
   - Mounting a host directory
   - Exposing Salt and containerd sockets
   - Running a privileged container, exposing the host `/dev` in the container
     for `parted` etc. to work
