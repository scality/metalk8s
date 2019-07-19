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
   │   └── some_image_name
   │       └── 1.0.1
   │           ├── <layer_digest>
   │           ├── manifest.json
   │           └── version
   ├── operator
   │   ├── crd
   │   │   └── some_crd_name.yaml
   │   └── deployment.yaml
   ├── product.txt
   └── ui
       └── deployment.yaml

.. _solution-archive-product-info:

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

.. note::

   If a Solution can require specific versions of MetalK8s on which to be
   deployed, requiring specific services (and their respective versions) to be
   shipped with MetalK8s (e.g. Prometheus/Grafana) is not yet feasible.
   It will probably be handled in the Operator declaration, maybe using a CR.

It is recommended for inspection purposes to include information related to
the build-time conditions, such as the following (where command invocations
should be statically replaced in the generated ``product.txt``)::

   GIT=$(git describe --always --long --tags --dirty)
   BUILD_TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%SZ)


.. _solution-archive-images:

OCI images
----------

MetalK8s exposes container images in the OCI_ format through a static
read-only registry. This registry is built with nginx_, and relies on having
a specific layout of image layers to then replicate the necessary parts of the
Registry API that CRI clients (such as ``containerd`` or ``cri-o``) rely on.

Using skopeo_, you can save images as a directory of layers::

   $ mkdir images/my_image
   $ # from your local Docker daemon
   $ skopeo copy --format v2s2 --dest-compress docker-daemon:my_image:1.0.0 dir:images/my_image/1.0.0
   $ # from Docker Hub
   $ skopeo copy --format v2s2 --dest-compress docker://docker.io/example/my_image:1.0.0 dir:images/my_image/1.0.0

Your ``images`` directory should now resemble this::

   images
   └── my_image
       └── 1.0.0
           ├── 53071b97a88426d4db86d0e8436ac5c869124d2c414caf4c9e4a4e48769c7f37
           ├── 64f5d945efcc0f39ab11b3cd4ba403cc9fefe1fa3613123ca016cf3708e8cafb
           ├── manifest.json
           └── version

Once all your images were stored this way, you can de-duplicate layers using
hardlinks, using the tool hardlink_::

   $ hardlink -c images

A detailed procedure for generating the expected layout is available at
`NicolasT/static-container-registry`_. You can use the script provided there
to generate your own NGINX configuration and test this static registry for
yourself. MetalK8s will generate its own configuration when importing the
Solution archive.

Each archive will be exposed as a single repository, where the name will be
computed as ``<NAME>-<VERSION>`` from :ref:`solution-archive-product-info`.

.. warning::

   Operator Deployments should not rely on this naming pattern for finding
   the images for their resources. Instead, the full repository prefix will be
   stored in a ``ConfigMap``, that Deployments will be able to expose as
   environment variables. See :doc:`./operator` for more details.

The images names and tags will be inferred from the directory names chosen when
using ``skopeo copy``. Using `hardlink` is highly recommended if one wants to
define alias tags for a single image.

MetalK8s also defines recommended standards for container images, described in
:ref:`req-container-images`.

.. _OCI: https://github.com/opencontainers/image-spec/blob/master/spec.md
.. _nginx: https://www.nginx.com
.. _skopeo: https://github.com/containers/skopeo
.. _hardlink: http://man7.org/linux/man-pages//man1/hardlink.1.html
.. _`NicolasT/static-container-registry`:
   https://github.com/nicolast/static-container-registry

Operator
--------

See :doc:`./operator` for how the ``/operator`` directory should be
populated.

Web UI
------

.. todo:: Create UI guidelines and reference here
