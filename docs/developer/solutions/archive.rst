Solution archive guidelines
===========================

To provide a predictable interface with packaged Solutions, MetalK8s expects a
few criteria to be respected, described below.


Archive format
--------------

Solution archives must use the `ISO-9660:1988`_ format, including `Rock Ridge`_
and Joliet_ directory records. The character encoding must be UTF-8_. The
conformance level is expected to be at most 3, meaning:

- Directory identifiers may not exceed 31 characters (bytes) in length
- File name + ``'.'`` + file name extension may not exceed 30 characters
  (bytes) in length
- Files are allowed to consist of multiple sections

The generated archive should specify a volume ID, set to
``{project_name} {version}``.

.. todo::

   Clarify whether Joliet/Rock Ridge records supersede the conformance level
   w.r.t. filename lengths


.. _`ISO-9660:1988`: https://www.iso.org/obp/ui/#iso:std:iso:9660:ed-1:v1:en
.. _`Rock Ridge`: https://en.wikipedia.org/wiki/Rock_Ridge
.. _Joliet: https://en.wikipedia.org/wiki/Joliet_(file_system)
.. _UTF-8: https://tools.ietf.org/html/rfc3629

Here is an example invocation of the common Unix mkisofs_ tool to generate such
archive::

   mkisofs
       -output my_solution.iso
       -R  # (or "-rock" if available)
       -J  # (or "-joliet" if available)
       -joliet-long
       -l  # (or "-full-iso9660-filenames" if available)
       -V 'MySolution 1.0.0'  # (or "-volid" if available)
       -gid 0
       -uid 0
       -iso-level 3
       -input-charset utf-8
       -output-charset utf-8
       my_solution_root/

.. _mkisofs: https://linux.die.net/man/8/mkisofs

.. todo::

   Consider if overriding the source files UID/GID to 0 is necessary


File hierarchy
--------------

Here is the file tree expected by MetalK8s to exist in each Solution archive::

   .
   ├── images
   │   ├── listing.yaml
   │   └── some_image_name.tar.gz
   ├── operator
   │   ├── crd
   │   │   └── some_crd_name.yaml
   │   └── deployment.yaml
   ├── product.txt
   └── ui
       └── deployment.yaml


Product information
-------------------

General product information about the packaged Solution must be stored in the
``product.txt`` file, stored at the archive root.

It must respect the following format (currently version 1, as specified by the
``ARCHIVE_LAYOUT_VERSION`` value)::

   NAME=Example
   VERSION=1.0.0-dev
   REQUIRE_METALK8S=">=2.0"
   ARCHIVE_LAYOUT_VERSION=1

It is recommended for inspection purposes to include information related to
the build-time conditions, such as the following (where command invocations
should be statically replaced in the generated ``product.txt``)::

   GIT=$(git describe --always --long --tags --dirty)
   BUILD_TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%SZ)


.. _solution-archive-images:

OCI images
----------

.. todo::

   With `#1049`_, we will have another standard way of serving OCI images with
   a read-only registry directly exposing the ISO contents.
   A specific process will be required to package these images, which we need
   to document here.

.. _`#1049`: https://github.com/scality/metalk8s/issues/1049

MetalK8s exposes container images in the OCI_ format through a registry.
Solutions should thus provide their container images in a compatible format,
for example using ``docker save``.

For size concerns, we expect such images to be compressed using ``gzip``.

Here is an example of how to build, save and compress an image with
``docker``::

   docker build --tag my-image:1.0.0 --file my_image.dockerfile
   docker save my-image:1.0.0 -o my_image_1_0.tar
   gzip -9 my_image_1_0.tar

.. _OCI: https://github.com/opencontainers/image-spec/blob/master/spec.md

MetalK8s also defines recommended standards for container images, described in
:ref:`req-container-images`.

In order for MetalK8s to populate its registry with accurate image tags,
Solutions must provide a ``listing.yaml`` file under ``/images``, with the
given format::

   apiVersion: metalk8s.scality.com/v1alpha1
   kind: ImagesList
   solution: MySolution
   images:
     - archive: my_image_1_0.tar.gz
       tag: my_image:1.0.0

.. note::

   Each Solution ISO will be made available to Pods as a single repository.
   Operator Deployments will then be required to accept the repository prefix,
   stored in a ``ConfigMap``, in order to properly configure the resources they
   manage.

Operator
--------

See :doc:`./operator` for how the ``/operator`` directory should be
populated.

Web UI
------

.. todo:: Create UI guidelines and reference here
