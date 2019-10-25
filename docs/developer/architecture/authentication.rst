Authentication Architecture Document
====================================

Context:
--------
Currently, when we deploy MetalK8s we pre provision super admin user with admin
password. Meaning anyone wanting to use K8S/Salt APIs should authenticate using
this single super admin user.
This is not good enough in term of security and flexibility.

We would like at least to be able to add different users with different
credentials and ideally to integrate K8S authentication system with external
identity provider.

Managing role binding between user / groups and roles is not part of this
specification.

Requirements:
-------------

Basically we are talking about

- Being able to provision users with an embedded identity provider
- Being able to integrate with an external Identity provider

Dex https://github.com/dexidp/dex seems to be the preferred solution for now,
for both local identity provider or proxy to external identity provider.
Integration with LDAP or Microsoft AD are the most important ones to support.

We may want to keep the concept of pre provisioned superadmin user
whatever Identity provider method we use ... to be discussed. 

User Stories:
-------------
**Super admin user password**

As an IT Generalist, I want to update super admin user password in order to
secure access to all UIs / APIs

Right after bootstrap node installation, the first time I log into the MetalK8s
admin UI,
I will be asked to change the super admin password. I would probably need to
re-login just after that.

In any cases, I should be able to reset this password, from CLI, in case it has
been lost.

**User Management with Dex as an Identity provider**

As an IT Generalist, I want to provision/edit users
group provisioning not supported by Dex from what I understand

Ideally, we have one dedicated page in MetalK8s admin UI allowing the IT
Generalist to manage the list of users. Maybe for a first iteration, this is
done from CLI with well documented procedure. In any cases, password should
not be stored in clear text and easily accessible.

**External Identity Provider Integration**

As an IT Generalist, I want to leverage my Identity provider in order to reuse
already provisioned users & groups.

The way we do that integration is ideally through a page in MetalK8s UI, but
probably acceptable to make the feature available through CLI only.

**configuration persistence**

Upgrading MetalK8s should not affect configuration that was done earlier. If
embedded Identity Provider was used and a list of users created, they still
exist after an upgrade. If configuration to integrate with external identity
provider was set up, it should remain after an Upgrade.
