RBAC for MetalK8s
=================

Context
-------

In order to secure the APIs of MetalK8s it makes sense to put in place a
predefined RBAC strategy. To ease the operation of MetalK8s this RBAC strategy
will be predefined.

MetalK8s authentication for normal users is delegated to DEX OIDC plugin.

MetalK8s APIs:

- k8s
- salt
- prometheus
- alertmanager
- loki

MetalK8s namespaces:

- kube-system
- metalk8s-auth
- metalk8s-ingress
- metalk8s-monitoring
- metalk8s-solutions
- metalk8s-ui

MetalK8s Roles:

- Cluster Admin Role
- Platform Admin Role
- Solution Admin Role
- Platform Viewer Role

MetalK8s Activities per Roles:

+----------------------------------+---------+----------+----------+----------+
| Activities                       | Cluster | Platform | Solution | Platform |
|                                  | Admin   | Admin    | Admin    | Viewer   |
+==================================+=========+==========+==========+==========+
| Bootstrap Node administration    |   X     |          |          |          |
| (backup, restore)                |         |          |          |          |
+----------------------------------+---------+----------+----------+----------+
| Bind roles to users & groups     |   X     |    ?     |    ?     |          |
+----------------------------------+---------+----------+----------+----------+
| Expansion of the cluster         |   X     |    X     |          |          |
| cp,infra or wp node              |         |          |          |          |
+----------------------------------+---------+----------+----------+----------+
| Provisioning of the MetalK8s     |   X     |    X     |          |          |
| Volumes                          |         |          |          |          |
+----------------------------------+---------+----------+----------+----------+
| Cluster and Service configuration|   X     |    X     |          |          |
| (dex,prom,am,loki)               |         |          |          |          |
+----------------------------------+---------+----------+----------+----------+
| Lifecycle of Solutions (import,  |   X     |          |     X    |          |
| activate, install, upgrade,      |         |          |          |          |
| downgrade)                       |         |          |          |          |
+----------------------------------+---------+----------+----------+----------+
| Monitoring and Alerting          |   X     |     X    |     X    |     X    |
| consumption                      |         |          |          |          |
+----------------------------------+---------+----------+----------+----------+
| Browse cluster topology          |   X     |     X    |    X     |     X    |
+----------------------------------+---------+----------+----------+----------+
| Bootstrap Node administration    |   X     |          |          |          |
| (backup, restore)                |         |          |          |          |
+----------------------------------+---------+----------+----------+----------+

Kubernetes RBAC concepts: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
Kubernetes API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.10/#-strong-api-overview-strong-

For each MetalK8s role, a Kubernetes Role and/or ClusterRole should be created
with the relevant information (name, resources, verbs and namespace when needed
)


After MetalK8s deployment, the Cluster Admin will need to bind them to a user
or a group of users which will be defined in the Identity Provider.
This operation is exposed through k8s API and ideally it is also accessible
from the Centralized CLI or from the MetalK8s UI.

W = write: create, update, delete, patch

R = read: get, list, watch

+----------------------+-----------+------------+---------------------------+
| role                 | Resources | verbs      | scope                     |
+======================+===========+============+===========================+
| Cluster Admin Role   | All       | R+W        | Cluster wide              |
+----------------------+-----------+------------+---------------------------+
| Platform Admin Role  | All       | R+W        | MetalK8s NS               |
|                      +-----------+------------+---------------------------+
|                      | Cluster   | R+W        | Cluster wide              |
|                      +-----------+------------+---------------------------+
|                      | All       | R          | Cluster wide              |
+----------------------+-----------+------------+---------------------------+
| Solution Admin Role  | All       | R+W        | Default & Solutions NS    |
|                      +-----------+------------+---------------------------+
|                      | All       | R          | Cluster wide              |
+----------------------+-----------+------------+---------------------------+
| Platform Viewer Role | All       | R          | Cluster wide              |
+----------------------+-----------+------------+---------------------------+

User Stories
------------

Upgrade from Previous MetalK8s versions
---------------------------------------

Documentation
-------------
