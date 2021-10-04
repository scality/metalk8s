.. _How to build an ISO:

How to build an ISO
===================

Our build system is based on `doit <http://pydoit.org/>`_.

To build, simply type ``./doit.sh``.

Note that:

- you can speed up the build by spawning more workers, e.g. ``./doit.sh -n 4``.
- you can have a JSON output with ``./doit.sh --reporter json``

The execution of tasks is printed to standard output. Each line shows a state
prefix, the task type, the task name, and an optional duration.

Tasks can be in one of four states:

- ``STARTED``: the execution started
- ``SUCCESS``: the execution suceeded
- ``ERROR``: the execution failed (more details will be printed to standard
  error)
- ``SKIPPED``: the task is skipped because already up-to-date

Main tasks
----------

To get a list of the available targets, you can run ``./doit.sh list``.

The most important ones are:

- ``iso``:  build the MetalK8s ISO
- ``lint``: run the linting tools on the codebase
- ``populate_iso``: populate the ISO file tree
- ``vagrant_up``: spawn a development environment using Vagrant

By default, i.e. if you only type ``./doit.sh`` with no arguments, the ``iso``
task is executed.

You can also run a subset of the build only:

- ``packaging``: download and build the software packages and repositories
- ``images``: download and build the container images
- ``salt_tree``: deploy the Salt tree inside the ISO
