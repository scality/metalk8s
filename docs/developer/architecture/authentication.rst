Authentication
==============

Context
-------

Currently, when we deploy MetalK8s we pre-provision a super admin user with a
username/password pair. This implies that anyone wanting to use the K8S/Salt
APIs needs to authenticate using this single super admin user.

Another way to access the APIs is by using the K8S admin certificate which is
stored in ``/etc/kubernetes/admin.conf``. We could also manually provision
other users, their corresponding credentials as well as role bindings but this
current approach is inflexible to operate in production setups and security is
not guaranteed since username/password pairs are stored in cleartext.

We would atleast like to be able to add different users with different
credentials and ideally integrate K8S authentication system with external an
identity provider.

Managing K8S role binding between user/groups High level roles and K8S roles
is not part of this specification.

.. _authentication-requirements:

Requirements
------------

Basically, we are talking about:

- Being able to provision users with an local Identity Provider (IDP)
- Being able to integrate with an external IDP

Integration with LDAP and Microsoft Active Directory(AD) are the most important
ones to support.

User Stories
------------

Pre-provisioned user and password change
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

In order to stay aligned with many other applications, it would make sense to
have a pre-provisioned user with all privileges (kind of super admin) and
pre-provisioned password so that it is easy to start interacting with the
system through various admin UIs.
Whatever UI this user opens for the first time, the system should ask him/her
to change the password for obvious security reasons.

User Management with local IdP
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

As an IT Generalist, I want to provision/edit users and high-level roles.
The MetalK8s high-level roles are:

- Cluster Admin role
- Solution Admin role
- Read Only

This is done from CLI with well-documented procedure.
Entered passwords are never visible and encrypted when stored in local IDP DB.
The CLI tool enables to add/delete and edit passwords and roles.

External IDP Integration
~~~~~~~~~~~~~~~~~~~~~~~~

As an IT Generalist, I want to leverage my organisation's IDP to reuse
already provisioned users & groups.
The way we do that integration is through a CLI tool which does not require to
have deep knowledge in K8S or in any local IDP specifics.
When External IDP Integration is set up, we can always use local IDP to
authenticate.

Authentication check
~~~~~~~~~~~~~~~~~~~~

UI should make sure the user is well authenticated and if not, redirect to
the local IDP login page. In the local IDP login page, the user should choose
between authenticating with local IDP or with external IDP.
If no external IDP is configured, no choice is presented to the user.
This local IDP login page should be styled so that it looks like any other
MetalK8s or solutions web pages. All admin UIs should share the same IDP.

Configuration persistence
~~~~~~~~~~~~~~~~~~~~~~~~~

Upgrading or redeploying MetalK8s should not affect configuration that was done
earlier (i.e. local users and credentials as well as external IDP integration
and configuration)

SSO between Admin UIs
~~~~~~~~~~~~~~~~~~~~~

Once IDP is in place and users are provisioned, one authenticated user can
easily navigate to the other admin UIs without having to re-authenticate.

Open questions
--------------

- Authentication across multiple sites
- SSO across MetalK8s and solutions Admin UIs and other workload Management UIs
- Our customers may want to collect some statistics out of our Prometheus
  instances.
  This API could be authenticated using OIDC, using an OIDC proxy, or stay
  unauthenticated. One should consider the following factors:

  - the low sensitivity of the exposed data
  - the fact that it is only exposed on the control-plane network
  - the fact that most consumers of Prometheus stats are not human
    (e.g. Grafana, a federating Prometheus, scripts and others), hence not
    well-suited for performing the OIDC flow

Design Choices
--------------

`Dex <https://github.com/dexidp/dex/>`_ is chosen as an Identity Provider(IdP)
in MetalK8s based on the above :ref:`authentication-requirements` for the
following reasons:

* Dex's support for multiple plugins enable integrating the OIDC flow
  with existing user management systems such as Active Directory,
  LDAP, SAML and others.
* Dex can be seamlessly deployed in a Kubernetes cluster.
* Dex provides access to a highly customizable UI which is a step closer to
  good user experience which we advocate for.
* Dex can act as a fallback Identity Provider in cases where the external
  providers become unavailable or are not configured.

Rejected design choices
~~~~~~~~~~~~~~~~~~~~~~~

Static password file Vs OpenID Connect
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Using static password files involves adding new users by updating a static file
located on every control-plane Node. This method requires restarting the
Kubernetes API server for every new change introduced.

This was rejected since it is inflexible to operate, requires storing user
credentials and there is no support for a pluggable external identity provider
such as LDAP.

X.509 certificates Vs OpenID Connect
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Here, each user owns a signed certificate that is validated by the Kubernetes
API server.

This approach is not user-friendly that is each certificate has to be manually
signed. Providing certificates for accessing the MetalK8s UI needs
much more efforts since these certificates are browser incompatible.
Using certificates is tedious since the certificate revocation process is also
cumbersome.

Keycloak Vs Dex
~~~~~~~~~~~~~~~

Both systems use OpenID Connect(OIDC) to authenticate a user using a
standard OAuth2 flow.

They both offer the ability to have short lived sessions so that user access
can be rotated with minimum efforts.

Finally, they both provide a means for identity management to be handled by an
external service such as LDAP, Active Directory, SAML and others.

Why not `Keycloak <https://www.keycoak.org/>`_?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Keycloak while offering similar features as Dex and even much more was rejected
for the following reasons:

- Keycloak is complex to operate(requires its own standalone database) and
  manage(frequent database backups are required).

- Currently, no use case exist for implementing a sophisticated Identity
  Provider like Keycloak when the minimal Identity Provider from Dex is
  sufficient.

Note that, Keycloak is considered a future fallback Identity Provider if
the need ever arises from a customer standpoint.

Unexploited choices
~~~~~~~~~~~~~~~~~~~

* `Guard <https://github.com/appscode/guard/>`_

A Kubernetes webhook authentication server by AppsCode, allowing you to
log into your Kubernetes cluster by using various identity providers such as
LDAP.

* `ORY Hydra <https://github.com/ory/hydra/>`_

It's an OpenID Connect provider optimized for low resource consumption.
ORY Hydra is not an identity provider but it is able to connect to existing
identity providers.

Implementation Details
----------------------

Iteration 1
~~~~~~~~~~~

- Using Salt, generate self-signed certificates needed for Dex deployment
- Deploy Dex in MetalK8s from the official **Dex Charts** while making use of
  the generated certificates above
- Provision an admin superuser
- Configure Kubernetes API server flags to use Dex
- Expose Dex on the control-plane using Ingress
- Print the admin super user credentials to the CLI after MetalK8s bootstrap is
  complete
- Implement MetalK8s UI integration with Dex
- Theme the Dex GUI to match MetalK8s UI specs(optional for iteration 1)

Iteration 2
~~~~~~~~~~~

- Provide documentation on how to integrate with these external Identity
  Providers especially LDAP and Microsoft Active Directory.

Iteration 3
~~~~~~~~~~~

- Provide Single sign-on(SSO) for Grafana
- Provide SSO between admin UIs

Iteration 4
~~~~~~~~~~~

- Provide a CLI command to change the default superuser password as a prompt
  after bootstrap
- Provide a CLI for user management and provisioning

The following operations will be supported using the CLI tool:

- Create users password
- List existing passwords
- Delete users password
- Edit existing password

The CLI tool will also be used to create MetalK8s dedicated roles as already
specified in the requirements section of this document.
(see high-level roles from the requirements document)

Since it is not advisable to perform the above mentioned operations at the Dex
ConfigMap level, using the Dex gRPC API could be the way to go.

Iteration 5
~~~~~~~~~~~

- Demand for a superuser's default password change upon first UI access
- Provide UI integration that performs similar CLI operations for user
  management and provisioning

This means from the MetalK8s UI, a Cluster administrator should be able to do
the following:

- Create passwords for users
- List existing passwords
- Delete users password
- Edit existing password

.. note::

   This iteration is completely optional for reasons being that the Identity
   Provider from Dex acts as a fallback for Kubernetes Administrators who do
   not want to use an external Identity Provider(mostly because they
   have a very small user store).

Documentation
-------------

In the Operational Guide:

* Document the predefined dex roles(Cluster Admin role, Solution Admin role,
  Read Only role), their access levels and how to create them.
* Document how to create users and the secrets associated to them.
* Document how to integrate Dex with external Identity Providers such as LDAP
  and Microsoft Active Directory.

In the Installation/Quickstart Guide

* Document how to setup/change the superuser password


Test Plan
---------

We could add some automated end-to-end tests for Dex user creation,
and deletion using the CLI and then setup a mini-lab on scality cloud to try
out the UI integration.
