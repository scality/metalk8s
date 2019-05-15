Deployment
==========

Here is a diagram representing how MetalK8s orchestrates deployment on a set of
machines:

.. uml:: deployment.uml

Some notes
----------

- The intent is for this installer to deploy a system which looks exactly like
  one deployed using ``kubeadm``, i.e. using the same (or at least highly
  similar) static manifests, cluster ``ConfigMaps``, RBAC roles and bindings,
  ...

The rationale: at some point in time, once ``kubeadm`` gets easier to embed in
larger deployment mechanisms, we want to be able to switch over without too
much hassle.

Also, ``kubeadm`` applies best-practices so why not follow them anyway.

Configuration
^^^^^^^^^^^^^

To launch the bootstrap process, some input from the end-user is required,
which can vary from one installation to another:

- CIDR (i.e. ``x.y.z.w/n``) of the control plane networks to use

  Given these CIDR, we can find the address on which to bind services like
  ``etcd``, ``kube-apiserver``, ``kubelet``, ``salt-master`` and others.

  These should be existing networks in the infrastructure to which all hosts
  are connected.

  This is a list of CIDRs, which will be tried one after another, to find a
  matching local interface (i.e. hosts comprising the cluster may reside in
  different subnets, e.g. control plane in VMs, workload plane on physical
  infrastructure).

- CIDRs (i.e. ``x.y.z.w/n``) of the workload plane networks to use

  Given these CIDRs, we can find the address to be used by the CNI overlay
  network (i.e. Calico) for inter-``Pod`` routing.

  This can be the same as the control plane network.

- CIDR (i.e. ``x.y.z.w/n``) of the ``Pod`` overlay network

  Used to configure the Calico ``IPPool``. This must be a non-existing network
  in the infrastructure.

  Default: ``10.233.0.0/16``

- CIDR (i.e. ``x.y.z.w/n``) of the ``Service`` network

  Default: ``10.96.0.0/12``

- VIP for the ``kube-apiserver`` and ``keepalived`` toggle

  Used as the address of ``kube-apiserver`` where required. This can either be
  a VIP managed by custom load-balancing/high-availability infrastructure, in
  which case the ``keepalived`` toggle must be off, or one which our platform
  will manage using ``keepalived``.

  If ``keepalived`` is enabled, this VIP must sit in a control plane CIDR
  shared by all control plane nodes.

  Note: we run ``keepalived`` in unicast mode, which is an extension of classic
  VRRP, but removes the need for multicast support on the network.

Firewall
^^^^^^^^

We assume a host-based firewall is used, based on ``firewalld``. As such, for
any service we deploy which must be accessible from the outside, we must set up
an appropriate rule.

We assume SSH access is not blocked by the host-based firewall.

These services include:

- VRRP if ``keepalived`` is enabled on control-plane nodes
- HTTPS on the bootstrap node, for ``nginx`` fronting the OCI registry and
  serving the yum repository
- ``salt-master`` on the bootstrap node
- ``etcd`` on control-plane / etcd nodes
- ``kube-apiserver`` on control-plane nodes
- ``kubelet`` on all cluster nodes
