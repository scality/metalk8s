Control Plane Ingress
=====================

Context
-------

Initially, Control Plane Ingress Controller was deployed using a DaemonSet with
a ClusterIP service using Bootstrap Control Plane IP as External IP and then
configuring all Control Plane components using this “External IP” (like OIDC
and various UIs).

So it means, we can only reach those components using Bootstrap Control
Plane IP, and if, for whatever reason, Bootstrap is temporary down you can no
longer access any UIs and you need to reconfigure all components manually,
change the IP used everywhere to another Control Plane node IP, in order to
restore access to Control Plane components, or if the Bootstrap is down
permanently you need to restore the Bootstrap node.

Here, we want to solve this issue and make Control Plane components Highly
Available, so if you lose one node, including Bootstrap Node, you can still
access various UIs.
NOTE: In this document, we do not talk about the High Availability of the
components itself but really only to the access through the Ingress
(e.g.: We do not want to solve salt-master HA here).

User Stories
------------

MetalK8s and Grafana UIs HA
~~~~~~~~~~~~~~~~~~~~~~~~~~~

I have a multi-node MetalK8s cluster, with at least 3 Control Plane nodes
if I lose one of the Control Plane nodes (including the Bootstrap one)
I can still access and authenticate on the MetalK8s and Grafana UIs.

Design Choices
--------------

To have a proper HA Control Plane Ingress we want to use a
`Virtual IP <https://en.wikipedia.org/wiki/Virtual_IP_address>`_ using
`MetalLB <https://metallb.universe.tf/>`_ so that we can rely on layer2
ARP requests when possible.

But in some network, it may be not possible to use this method
so we also let the possibility to not use MetalLB but instead just
assign an External IP, provided by the user, that we expect to be a
Virtual IP, and we do not manage on our side but it’s managed by the user
using whatever mechanism to switch this IP between Control Plane nodes.

To summarize 2 different deployments possible depending on the user
environment:

- Using VIP managed by Layer2 ARP with MetalLB (builtin MetalK8s)
- Using a user-provided IP that should switch between Control
  Plane nodes (managed by the user)

NOTE: In those 2 approaches we want the user to provide the Control
Plane Ingress IP he wants to use.

Rejected Design Choices
-----------------------

Manage Virtual IP by MetalK8s
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Instead of using MetalLB to manage the Virtual IP we could have manage this
Virtual IP directly in MetalK8s with KeepAliveD (or any other “HA tool”) this
way we really controle the Virtual IP.

This approach was rejected because it seems to do not provide any real
advantage compare to use MetalLB directly that will manage this Virtual IP
for us and may provide a bunch of other useful feature for the future.

Rely on DNS resolution
~~~~~~~~~~~~~~~~~~~~~~

Instead of using a Virtual IP we could rely on DNS resolution use this
FQDN to configure Control Plane components. In this case we let the user
configure his DNS to resolve on an IP of one Control Plane node.

WIth this approach we let the DNS server handle the “High Availability” of
the Control Plane UIs, basically if we lose the node that resolve the DNS
then we expect the DNS server to switch to another IP of a working Control
Plane node.

This approach was rejected because it’s not a real HA as we expect DNS server
to have some intelligence which it likely not the case in most of user
environments.

Use Nodes Control Plane IPs
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Instead of using a Virtual IP or a FQDN we could still rely on Control Plane
IPs and configure all Control Plane components using either relative path
either all node Control Plane IPs. So that we can reach all Control Plane
components using any Control Plane IP.

With this approach we do not need any specific infrastructure on the user
environment but it means every time we add a new Control Plane node we need
to re-configure every Control Plane component that use Control Plane IPs but
we also need to re-configure every Control Plane component when we remove a
Control Plane node.

This approach was rejected because Control Plane components we deploy today
in MetalK8s does not seems to all support relative path and it does not
seems to be possible to have proper HA without re-configuring some Control
Plane components when we lose a Control Plane node.

Non-Goals
---------

These points may be addressed later (or not) but in this document, we focus on
a first simple deployment that (should) fit in most of the user environments.

- Manage Workload Plane Ingress HA
- Manage BGP routers

Implementation Details
----------------------

Control Plane Ingress IP
~~~~~~~~~~~~~~~~~~~~~~~~

In order to configure all Control Plane components we need a single IP as
Control Plane Ingress, so we expect the user to provide this Control Plane
Ingress IP in the Bootstrap configuration file.
To have some backward compatibility this Ingress IP is only mandatory when
you use MetalLB and will default to Bootstrap Control Plane IP if not
(so that we have the same behavior as before).

This Control Plane Ingress IP can be changed at any time just by editing
the Bootstrap configuration file and follow a simple documented procedure
with some Salt states to reconfigure every component that needs to be
re-configured.

NOTE: Changing this Control Plane Ingress IP means we need to reconfigure
all Kubernetes APIServer since we use this Ingress IP as an OIDC provider.

MetalLB Configuration
~~~~~~~~~~~~~~~~~~~~~

MetalLB is not deployed in every environment so it needs to be enabled
from the Bootstrap configuration file, that’s why we have a new field about
MetalLB in the Control Plane network section.

Today, we only allow MetalLB using Layer2 so we do not need to make MetalLB
configuration configurable, if MetalLB is enabled in Bootstrap configuration
MetalK8s will deploy the following configuration for MetalLB:

.. code-block:: yaml

    address-pools:
    - name: control-plane-ingress-ip
      protocol: layer2
      addresses:
      - <control-plane ingress ip>/32
      auto-assign: false

Same as the Control Plane Ingress IP, we can switch from non-MetalLB to MetalLB
(and the opposite) at any time just by following the same procedure.

Deployment
~~~~~~~~~~

As for every other addon in MetalK8s, we will use the MetalLB helm chart and
render this one using a specific “option” file. But this one will not be always
deployed as we only want to deploy it when a specific key is set in the
Bootstrap configuration file, so in the Salt pillar at the end.

When we use MetalLB we do not want to use the same NGINX Ingress Controller
deployments, since MetalLB will be the entry point in the Kubernetes cluster
we do not need to use a DaemonSet running on every Control Plane nodes,
instead, we will use a Deployment with 2 replicas.

We also need to configure the Service for Ingress Controller differently
depending on if we use MetalLB or not when we use it we want to use a
LoadBalancer service, set the LoadBalancerIP to IngressIP provided by
the user and set externalTrafficPolicy to Local. If we do not use MetalLB
then we use ClusterIP Service with IngressIP provided by the user as External
IPs.

It means the deployment of NGINX Ingress Controller depends on some Salt
pillar values, also since we want to be able to switch between MetalLB and
non-MetalLB we need to make sure the Salt states that deploy NGINX Ingress
Controller remove no-longer-needed objects (e.g.: if you switch from
non-MetalLB to MetalLB you want to remove the DaemonSet for NGINX Ingress
Controller).

Documentation
-------------

- Describe all new Bootstrap configuration fields
- Add a simple procedure to change the Control Plane Ingress IP and
  reconfigure all Control Plane conponents that need to.

Test Plan
---------

Add some End-to-End tests in the CI:

- Use MetalLB and a VIP as Control Plane Ingress IP
- Test failover of MetalLB VIP
- Change Control Plane Ingress IP using documented procedure
- Switch from non-MetalLB to MetalLB using documented procedure
