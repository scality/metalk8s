Authentication Architecture Document
====================================

Context:
--------
Currently, when we deploy MetalK8s we pre provision super admin user with admin
password. Meaning anyone wanting to use K8S/Salt APIs should authenticate using
this single super admin user. Another way to access the APIs is by using K8S
admin certificate that is stored in /etc/kubernetes/admin.conf. We could also
manually provisioned other users and credentials as well as roles binding
but the way the functionality is accessible currently is too complex and not
enough secured since user / password are stored in clear text.
This is not good enough in term of security and flexibility.

We would like at least to be able to add different users with different
credentials and ideally to integrate K8S authentication system with external
identity provider.

Managing K8S role binding between user / groups High level roles and K8S roles
is not part of this specification.

Requirements:
-------------

Basically we are talking about:

- Being able to provision users with an embedded Identity provider (IDP)
- Being able to integrate with an external IDP

`Dex <https://github.com/dexidp/dex>`_ seems to be the preferred solution for
now, for both local identity provider or proxy to external IDP.
Integration with LDAP or Microsoft AD are the most important ones to support.

User Stories:
-------------
**User Management with Dex as an IDP**

As an IT Generalist, I want to provision/edit usersa and high level roles.
group provisioning not supported by Dex from what I understand.
The Product high level roles are:

- Cluster Admin role
- Solution Admin role
- Read Only

This is done from CLI with well documented procedure.
Entered passwords are never visible and encrypted when stored in DEX DB.
The CLI tool enables to add / delete and edit passwords and roles.

The CLI tool is used right after bootstrap node deployment to provision the
very first user (which won't be provisioned anymore by default)


**External IDP Integration**

As an IT Generalist, I want to leverage my IDP in order to reuse already
provisioned users & groups.
The way we do that integration is through a CLI tool. This CLI tool will take
LDAP or AD integration configuration file as an input.
When External IDP Integration is set up, we can always use embedded IDP to
authenticate.


**Authentication check**

UI should make sure user is well authenticated and if not, redirect to
the DEX login page. In that DEX login page, the user should choose between
authenticating with DEX local users or with external IDP.
If no external IDP is configured, no choice is presented to the user.
This DEX login page should be styled so that it looks like any other Scality
web pages.

**Configuration persistence**

Upgrading or redeploying MetalK8s should not affect configuration that was done
earlier (i.e. local users and credentials as well as external IDP integration
and configuration)

**Securing access to stats and alerts**

Our customers, may want to collect some statistics out of our Prometheus and
Alert Manager instances. Some other may want to leverage K8S / Salt APIs to
drive administration of the system. Those APIs should be secured enough either
through OIDC, Service account or because only accessible through control plane
Network.

**SSO between Admin UIs**

Once DEX is in place and user are provisioned through external IDP one
authenticated user can easily navigate to the other admin UIs without having
to re-authenticate.

Open questions:
---------------

- Authentication across multiple sites
- SSO across Admin UIs (control plane) and Zenko Management UIs (on data plane)
