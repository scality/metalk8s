.. The structure of this document is based on https://github.com/sphinx-doc/sphinx/blob/master/CHANGES

Release 0.1.1 (in development)
==============================

Features added
--------------
:ghpull:`11` - run the OpenStack `ansible-hardening`_ role on nodes to apply
security hardening configurations from the
`Security Technical Implementation Guide (STIG)`_ (:ghissue:`88`)

.. _ansible-hardening: https://github.com/openstack/ansible-hardening
.. _Security Technical Implementation Guide (STIG): http://iase.disa.mil/stigs/Pages/index.aspx

:ghpull:`127` - deploy Cerebro_ to manage the Elasticsearch cluster
(:ghissue:`126`)

.. _Cerebro: https://github.com/lmenezes/cerebro

Bugs fixed
----------
:ghissue:`103` - set up host anti-affinity for Elasticsearch service scheduling
(:ghpull:`113`)

:ghissue:`120` - required facts not gathered when running the `services`
playbook in isolation (:ghpull:`132`)

:ghpull:`134` - fix `bash-completion` in the MetalK8s Docker image

Release 0.1.0
=============
This marks the first release of `MetalK8s`_.

.. note:: Compatibility with future releases of MetalK8s is not guaranteed until
   version 1.0.0 is available. When deploying a cluster using pre-1.0 versions
   of this package, you may need to redeploy later.

.. _MetalK8s: https://github.com/Scality/metal-k8s

Incompatible changes
--------------------
:ghpull:`106` - the Ansible playbook which used to be called
:file:`metal-k8s.yml` has been moved to :file:`playbooks/deploy.yml`

Features added
--------------
:ghpull:`100` - disable Elasticsearch deployment by setting
`metalk8s_elasticsearch_enabled` to `false` (:ghissue:`98`)

:ghpull:`104` - `kube-proxy` now uses `ipvs` instead of `iptables` to route
*Service* addresses, in preparation for Kubernetes 1.11. The `ipvsadm` tool is
installed on all `k8s-cluster` hosts.

:ghpull:`104` - use CoreDNS instead of kubedns for in-cluster DNS services, in
preparation for Kubernetes 1.11.

:ghpull:`113` - deploy the Prometheus `node_exporter` on `k8s-cluster` and
`etcd` hosts instead of using a *DaemonSet*

Known issues
------------
:ghissue:`62` - Elasticsearch Curator may not properly prune old `logstash-*`
indices
