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
