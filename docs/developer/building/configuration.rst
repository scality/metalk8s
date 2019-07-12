Configuration
=============

You can override some buildchain's settings through a ``.env`` file at the root
of the repository.

Available options are:

- ``PROJECT_NAME``: name of the project
- ``BUILD_ROOT``: path to the build root (either absolute or relative to the
  repository)
- ``VAGRANT_PROVIDER``: type of machine to spawn with Vagrant
- ``VAGRANT_UP_ARGS``: command line arguments to pass to ``vagrant up``
- ``VAGRANT_SNAPSHOT_NAME``: name of auto generated Vagrant snapshot
- ``DOCKER_BIN``: Docker binary (name or path to the binary)
- ``GIT_BIN``: Git binary (name or path to the binary)
- ``HARDLINK_BIN``: hardlink binary (name or path to the binary)
- ``MKISOFS_BIN``: mkisofs binary (name or path to the binary)
- ``SKOPEO_BIN``: skopeo binary (name or path to the binary)
- ``VAGRANT_BIN``: Vagrant binary (name or path to the binary)
- ``GOFMT_BIN``: gofmt binary (name or path to the binary)
- ``OPERATOR_SDK_BIN``: the Operator SDK binary (name or path to the binary)

Default settings are equivalent to the following ``.env``:

::

   export PROJECT_NAME=MetalK8s
   export BUILD_ROOT=_build
   export VAGRANT_PROVIDER=virtualbox
   export VAGRANT_UP_ARGS="--provision  --no-destroy-on-error --parallel --provider $VAGRANT_PROVIDER"
   export DOCKER_BIN=docker
   export HARDLINK_BIN=hardlink
   export GIT_BIN=git
   export MKISOFS_BIN=mkisofs
   export SKOPEO_BIN=skopeo
   export VAGRANT_BIN=vagrant
   export GOFMT_BIN=gofmt
   export OPERATOR_SDK_BIN=operator-sdk
