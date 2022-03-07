Requirements
============

In order to build MetalK8s we rely and third-party tools, some of them are
mandatory, others are optional.


.. _build-required-deps:

Mandatory
---------

- `Python <https://www.python.org/>`_ 3.6 or higher: our buildchain is
  Python-based
- `docker <https://www.docker.com/>`_ 17.03 or higher: to build some images
  locally
- `skopeo <https://github.com/containers/skopeo>`_, 0.1.19 or higher: to save
  local and remote images
- `hardlink <https://jak-linux.org/projects/hardlink/>`_: to de-duplicate images
  layers
- mkisofs: to create the MetalK8s ISO
- `implantisomd5` from the
  `isomd5sum <https://github.com/rhinstaller/isomd5sum>`_ package: to embed an
  MD5 checksum in the generated ISO, allowing for its integrity to be checked

Optional
--------

- `git <https://git-scm.com/>`_: to add the Git reference in the build metadata
- `Vagrant <https://www.vagrantup.com/>`_, 1.8 or higher: to spawn a local
  cluster (VirtualBox is currently the only provider supported)
- `VirtualBox <https://www.virtualbox.org>`_: to spawn a local cluster
- `tox <https://pypi.org/project/tox>`_: to run the linters

Development
-----------

If you want to develop on the buildchain, you can install the development
dependencies with ``pip install -r buildchain/requirements.txt``.
