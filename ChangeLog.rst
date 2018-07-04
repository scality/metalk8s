.. The structure of this document is based on https://github.com/sphinx-doc/sphinx/blob/master/CHANGES

Release 0.1.0 (in development)
==============================
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

Known issues
------------
:ghissue:`62` - Elasticsearch Curator may not properly prune old `logstash-*`
indices

:ghissue:`107` - the dashboard for Etcd monitoring isn't properly loaded by
Grafana

:ghissue:`108` - Elasticsearch metrics are not properly scraped by Prometheus
