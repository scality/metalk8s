Authentication Architecture Document
====================================

Context:
--------
Currently, when we deploy MetalK8s we pre provision super admin user with admin
password and with all privileges.
This is not good enough in term of security and flexibility.

The one deploying MetalK8s would like to decide who can do what (with UI
 and API) and ideally leverage what he already has in place in term of Identity
 management and security.

Managing the users and privileges is likely the first thing we do right after
bootstrap node installation

Requirements:
-------------

Basically we are talking about

- Being able to provision users with an embedded identity provider
- Being able to integrate with an external Identity provider
- Being able to map MetalK8s roles with groups and users.

Dex https://github.com/dexidp/dex seems to be the preferred solution for now,
for both local identity provider or proxy to external identity provider.
Integration with LDAP or Microsoft AD are the most important ones to support.

All of this comes with a set of high level roles we can map to the different
users.
As of now, we see 3 main roles:
- **cluster admin role**: I can do everything, especially change cluster
topology and provision volumes
- **solution admin role**: I can import solutions and deploy components
- **read only role**: I can view any resource or monitoring info but I cannot
change anything

Each solution may introduce additional roles

Those roles should be taken into account in the various UIs so that one user
with specific roles
have access to the corresponding functionalities only.

We probably want to have the concept of superadmin user who would exist
whatever Identity provider method we use.

User Stories:
-------------
**Super admin user password**

As an IT Generalist, I want to update superadmin user password in order to
secure access to all UIs / APIs

Right after bootstrap node installation, the first time I log into the MetalK8s
admin UI,
I will be asked to change the superadmin password. I would probably need to
re-login just after that.

In any cases, I should be able to reset this password, from CLI, in case it has
been lost.

**User Management with Dex as an Identity provider**

As an IT Generalist, I want to provision/edit users
group provisioning not supported by Dex from what I understand

Ideally, we have one dedicated page in MetalK8s admin UI allowing the IT
Generalist to manage the list of users.

**External Identity Provider Integration**

As an IT Generalist, I want to leverage my Identity provider in order to reuse
already provisioned users & groups.

The way we do that integration is ideally through a page in MetalK8s UI, but
probably acceptable to make the feature available through CLI only.

Once the configuration is done, I can see the list of groups and users in
MetalK8s UI

**Role mapping**

As an IT Generalist, I want to update roles for one user or group, in order to
grant him or remove certain privileges.

This functionality should be provided within MetalK8s UI.
Ideally, the way the functionality is consumed should not depend on Dex being
used
as an Identity provider or Dex being used as a proxy to an external Identity
Provider.

**Secure APIs based on roles**
As anyone I must get a 403 if my identity is not validated and if my role does
not permit me to access a certain API / VERB

**Secure UIs pages & functionalities based on roles**
As an IT Generalist with one or multiple roles, I must see and access only
features associated with these roles.
