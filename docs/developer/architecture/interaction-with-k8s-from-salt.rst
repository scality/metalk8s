Interaction with Kubernetes API from Salt
=========================================

Context
-------

In MetalK8s we need to interact with Kubernetes API from Salt in order to
create and edit various objects. Since the Salt Kubernetes module is not
flexible enough (at least today) we decided to build our own Salt module that
will cover all we need in MetalK8s. This Salt module relies on
`python-kubernetes`_ lib so that we have a proper python class for every
Kubernetes object and we can validate the object content without any call to
the actual Kubernetes API.

But `python-kubernetes`_ lib is a bit late on Kubernetes versions (at the
time of writing, the latest `python-kubernetes`_ is for k8s-1.18 and k8s
1.22.1 just came out) so it means that some Kubernetes objects from the
latest versions cannot be managed by this python lib.

Here, we want to solve this issue and make sure when a new Kubernetes
version comes out that we can easily support interaction with all the
Kubernetes API from Salt.

Design Choices
--------------

Instead of relying on model and API object from `python-kubernetes`_, which
is the representation from ``openapi`` of a specific Kubernetes version, we
can directly use `python-base`_ which is what is used in the back by
`python-kubernetes`_.

This `python-base`_ has a ``DynamicClient`` that can be used to manage any
Kubernetes objects no matter the Kubernetes version. It’s really more
flexible it’s mean that we do not validate the manifest we send to
Kubernetes API, but the manifest can be validated using
`kubernetes-validate`_ lib.

This `kubernetes-validate`_ lib can have the same issue as
`python-kubernetes`_ as it needs to be generated for every Kubernetes
version, but it seems a bit more up-to-date and this validation is not
strictly needed to create the objects, so if a specific version of
`kubernetes-validate`_ is not yet released we could just remove the
validation waiting for a new version to be released.

In order to validate the request or test it we can use ``dryRun``
parameter from Kubernetes API, it could be really usefull especially
when using ``test`` mode from Salt.

Rejected Design Choices
-----------------------

Migrate to ``kubectl``
~~~~~~~~~~~~~~~~~~~~~~

To have proper support of the full Kubernetes API we could use directly
``kubectl``, which is the CLI build as part of Kubernetes.

The advantage of using ``kubectl`` is that we do not have anything to do in
order to support interaction with the new Kubernetes API and nothing (or
almost) to maintain in our Salt module that uses this CLI.

This approach was rejected because we need to use a CLI in order to do some
“HTTP query” to Kubernetes API that's a bit odd and it add an extra layer that
does not bring a lot of value compare to selected design.

Contribute to python-kubernetes Lib
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

We could contribute to `python-kubernetes`_ in order to make it compatible
with the latest versions of Kubernetes.

This approach was rejected, for the moment, because `python-kubernetes`_ start
to be really late on Kubernetes versions, and this work, likely, needs to be
done for every new Kubernetes version.

Direct HTTP Query to Kubernetes API from Python
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

We could build a Salt module that directly interacts with Kubernetes API the
way we want so that we do not rely on python-kubernetes but only implement the
interactions we need.

This approach was rejected because it means this Salt module needs to be
maintained for every new Kubernetes version and for every API/object we want
to support.

Implementation Details
----------------------

First Iteration
~~~~~~~~~~~~~~~

In order to be able to use ``DynamicClient`` from `python-base`_ we still
need to install a `python-kubernetes`_ version since `python-base`_ is not
packaged, but we do not need this `python-kubernetes`_ version to be
“compatible” with the Kubernetes version we run since we rely on
``DynamicClient`` that should be compatible with all Kubernetes versions.

Rework all Salt execution modules that interact with Kubernetes so that it
simply uses ``DynamicClient``, some examples can be found
`here <https://github.com/kubernetes-client/python/tree/master/examples/dynamic-client>`_.

The Salt state module will likely not be changed and will have the same
function as today (object_present, object_absent, object_updated) so it means
most of the Salt SLS will not be changed as well.

The Salt execution module will change a bit but the function exposed will
likely stay the same.

Most of the logic from the Kubernetes salt utils module can be removed.

Second Iteration (if needed)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If needed we can add some validation.

We can validate the manifest content before sending it to Kubernetes API, to
do so, we need to install `kubernetes-validate`_ python lib in the Salt master
container, and then it can be used easily directly from a ``DynamicClient``
instance using ``validate`` function.

Use ``dryRun`` parameter from Kubernetes API so that we can validate the
request.

Documentation
-------------

Normally nothing to change.

Test Plan
---------

Update the Salt unit tests for the execution module.

Existing end to end tests should be sufficient.


.. _python-base: https://github.com/kubernetes-client/python-base
.. _python-kubernetes: https://github.com/kubernetes-client/python
.. _kubernetes-validate: https://github.com/willthames/kubernetes-validate
