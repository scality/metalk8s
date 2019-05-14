# How to build MetalK8s

Our build system is based on [doit](http://pydoit.org/).

To build, simply type `./doit.sh`.

Note that:
- you can speed up the build by spawning more workers, e.g. `./doit.sh -n 4`.
- you can have a JSON output with `./doit.sh --reporter json`

When a task is prefixed by:
- `--`: the task is skipped because already up-to-date
- `.`: the task is executed
- `!!`: the task is ignored.

## Main tasks

To get a list of the available targets, you can run `./doit.sh list`.

The most important ones are:
- `iso`:  build the MetalK8s ISO
- `lint`: run the linting tools on the codebase
- `populate_iso`: populate the ISO file tree
- `vagrant_up`: spawn a development environment using Vagrant

By default, i.e. if you only type `./doit.sh` with no arguments, the `iso` task is
executed.

You can also run a subset of the build only:
- `packaging`: download and build the software packages and repositories
- `images`: download and build the container images
- `salt_tree`: deploy the Salt tree inside the ISO

## Customization

You can override some buildchain's settings through a `.env` file at the root of
the repository.

Available options are:

- `PROJECT_NAME`: name of the project
- `BUILD_ROOT`: path to the build root (either absolute or relative to the
  repository)
- `VAGRANT_PROVIDER`: type of machine to spawn with Vagrant
- `VAGRANT_UP_ARGS`: command line arguments to pass to `vagrant up`
- `VAGRANT_SNAPSHOT_NAME`: name of auto generated Vagrant snapshot
- `DOCKER_BIN`: Docker binary (name or path to the binary)
- `GIT_BIN`: Git binary (name or path to the binary)
- `HARDLINK_BIN`: hardlink binary (name or path to the binary)
- `MKISOFS_BIN`: mkisofs binary (name or path to the binary)
- `SKOPEO_BIN`: skopeo binary (name or path to the binary)
- `VAGRANT_BIN`: Vagrant binary (name or path to the binary)

Default settings are equivalent to the following `.env`:

```shell
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
```

## Cheatsheet

Here are some useful doit commands/features, for more information, the official
documentation is [here](http://pydoit.org/contents.html).

### doit tabcompletion

This generates completion for `bash` or `zsh` (to use it with your shell, see
the instructions [here](http://pydoit.org/cmd_other.html#tabcompletion))

### doit list

By default, `./doit.sh list` only shows the "public" tasks.

If you want to see the subtasks as well, you can use the option `--all`.

```shell
% ./doit.sh list --all
images       Pull/Build the container images.
iso          Build the MetalK8s image.
lint         Run the linting tools.
lint:shell   Run shell scripts linting.
lint:yaml    Run YAML linting.
[…]
```

Useful if you only want to run a part of a task (e.g. running the lint tool only
on the YAML files).

You can also display the internal (a.k.a. "private" or "hidden") tasks with the
`-p` (or `--private`) options.

And if you want to see **all** the tasks, you can combine both:
`./doit.sh list --all --private`.

### doit clean

You can cleanup the build tree with the `./doit.sh clean` command.

Note that you can have fine-grained cleaning, i.e. cleaning only the result of a
single task, instead of trashing the whole build tree: e.g. if you want to
delete the container images, you can run `./doit.sh clean images`.

You can also execute a dry-run to see what would be deleted by a clean command:
`./doit.sh clean -n images`.


### doit info

Useful to understand how tasks interact with each others (and for
troubleshooting), the `info` command display the task's metadata.

Example:

```shell
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
```

### Wildcard selection

You can use wildcard in task names, which allows you to either:
- execute all the sub-tasks of a specific task:
  `_build_packages:calico-cni-plugin:*` will execute all the tasks required to
  build the package.
- execute a specific sub-task for all the tasks:
  `_build_packages:*:pkg_get_source` will retrieve the source files for all the
  packages.

## Development

If you want to develop on the buildchain, you can add the development
dependencies with `pip install -r requirements/build-dev-requirements.txt`
