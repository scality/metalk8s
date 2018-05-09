Generating pre-provisioned VM images using Packer
=================================================
The manifests and scripts in this folder allow to create [Vagrant] *Boxes* using
[Packer].

[Vagrant]: https://www.vagrantup.com
[Packer]: https://www.packer.io

Note: what's below is tested with

- Packer 1.2.2
- Vagrant 2.0.3
- VirtualBox 5.2.8

[VirtualBox]: https://www.virtualbox.org

Note: even though there's some support for building Qemu/KVM *Boxes*, this is
currently not working (see below)

To get started, download the `packer` binary for your platform, and put it in
your `PATH`, or reference it when invoking `make` (see below).

Note: some Linux distributions come with a `packer` binary installed in `PATH`
which is *not* the `packer` we're looking for... The `Makefile` tries to check
for this and fail accordingly.

```shell
$ make box-virtualbox PACKER=/path/to/packer/binary
```

This takes a couple of minutes.

Once the *Box* is built, launch it using `vagrant`:

```shell
$ vagrant up
```

At the end of this procedure, some information is displayed on how to access
the running cluster and its services.

Note: consider using `make shell` from the top-level directory of this
repository to get an environment containing `kubectl` and `helm` installed. More
work on ease-of-use is to be done.

Access to the node
------------------
Use `vagrant ssh` to access the VM. Alternatively, a `vagrant` user is
available, as well as `root`, both with password `vagrant`.

Qemu/KVM and Vagrant/libvirt
----------------------------
The files in this folder contain support code for building Qemu/KVM images,
which one can run using *vagrant-libvirt*. This is, however, currently not
working: there are issues with networking. It seems like *vagrant-libvirt*
assigns an IP address to the running *Box* which is different from the one used
by `qemu` during `packer build`. As a result, `etcd` refuses to start.

TODO
----
- Enable [ElasticSearch] again, properly sized
- Get Qemu/KVM images to work
- Add some tooling to wait for Kubernetes services to be fully deployed before
finalizing the build: due to Kubernetes' out-of-band behaviour after deploying
new manifests, a VM image can be frozen before all images are pulled, at which
point they'll still need to be pulled when running the *Box* for the first time.

[ElasticSearch]: https://www.elastic.co/products/elasticsearch
