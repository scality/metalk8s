Buildchain features
===================

Here are some useful doit commands/features, for more information,
`the official documentation is here <http://pydoit.org/contents.html>`_.

doit tabcompletion
------------------

This generates completion for ``bash`` or ``zsh`` (to use it with your shell,
see `the instructions here <http://pydoit.org/cmd_other.html#tabcompletion>`_).

doit list
---------

By default, ``./doit.sh list`` only shows the "public" tasks.

If you want to see the subtasks as well, you can use the option ``--all``.

::

    % ./doit.sh list --all
    images       Pull/Build the container images.
    iso          Build the MetalK8s image.
    lint         Run the linting tools.
    lint:shell   Run shell scripts linting.
    lint:yaml    Run YAML linting.
    […]

Useful if you only want to run a part of a task (e.g. running the lint tool
only on the YAML files).

You can also display the internal (a.k.a. "private" or "hidden") tasks with the
``-p`` (or ``--private``) options.

And if you want to see **all** the tasks, you can combine both:
``./doit.sh list --all --private``.

doit clean
----------

You can cleanup the build tree with the ``./doit.sh clean`` command.

Note that you can have fine-grained cleaning, i.e. cleaning only the result of
a single task, instead of trashing the whole build tree: e.g. if you want to
delete the container images, you can run ``./doit.sh clean images``.

You can also execute a dry-run to see what would be deleted by a clean command:
``./doit.sh clean -n images``.


doit info
---------

Useful to understand how tasks interact with each others (and for
troubleshooting), the ``info`` command display the task's metadata.

Example:

::

   % ./doit.sh info _build_packages:calico-cni-plugin:pkg_srpm

   _build_packages:calico-cni-plugin:pkg_srpm

   Build calico-cni-plugin-3.5.1-1.el7.src.rpm

   status     : up-to-date

   file_dep   :
    - /home/foo/dev/metalk8s/_build/metalk8s-build-latest.tar.gz
    - /home/foo/dev/metalk8s/_build/packages/calico-cni-plugin/SOURCES/v3.5.1.tar.gz
    - /home/foo/dev/metalk8s/_build/packages/calico-cni-plugin/SOURCES/calico-ipam-amd64
    - /home/foo/dev/metalk8s/packages/calico-cni-plugin.spec
    - /home/foo/dev/metalk8s/_build/packages/calico-cni-plugin/SOURCES/calico-amd64

   task_dep   :
    - _package_mkdir_root
    - _build_packages:calico-cni-plugin:pkg_mkdir

   targets    :
    - /home/foo/dev/metalk8s/_build/packages/calico-cni-plugin-3.5.1-1.el7.src.rpm

Wildcard selection
------------------

You can use wildcard in task names, which allows you to either:

- execute all the sub-tasks of a specific task:
  ``_build_packages:calico-cni-plugin:*`` will execute all the tasks required
  to build the package.
- execute a specific sub-task for all the tasks:
  ``_build_packages:*:pkg_get_source`` will retrieve the source files for all
  the packages.
