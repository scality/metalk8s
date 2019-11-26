Identity and User Management
============================

Authenticating users in **MetalK8s** is implemented using Dex. **Dex**
implements a system of connectors that allows one to delegate authentication to
external OpenIDConnect(OIDC) Identity Providers while being able
to make use of their existing user stores.

This section highlights the procedures for adding and integrating Identity
Providers(such as LDAP, Microsoft Active Directory and SAML), provisioning
static users, user role management and password change procedures
necessary for user authentication and access control.


A fresh installation of MetalK8s comes with a static user store. In the absence
of an external Identity Provider, **MetalK8s** can utilize the users defined
within the static user store for authentication purposes.

.. Todo::

    - Define the MetalK8s roles(Mainly Admin role and Read-only roles).
    - Define how to create static users using K8s secrets.
    - Define how to bind users to any of the above roles.
    - Define how to the change password of a static user.

Adding external OpenIDConnect(OIDC) Identity Providers such as LDAP, AD and
SAML to MetalK8s is done by using Dex connectors.
The sections below documents the procedures needed to integrate an external
Identity Provider with focus on **LDAP** and **Microsoft Active Directory(AD)**

Prerequisites
-------------

The following prerequisites must be met in other to add support for an
external Identity Provider in a MetalK8s cluster.

.. Todo::

    - Document how to obtain Dex config file from K8s secrets
    - How to decode the conf file
    - How to add the connectors and how to patch the deployment

LDAP Integration
----------------

To integrate MetalK8s with an LDAP server, the following information is
required:

Basic authentication information
++++++++++++++++++++++++++++++++

- **LDAP server hostname**: which should be reachable from the cluster
- **Port**: on which to connect to the host (e.g. StartTLS: 389, TLS: 636)
- An LDAP base distinguished name **(DN)**: of a user that can do user searches
- Attributes used to describe users and groups. For example: email
- **Root CA**: (Optional) if certificate CA verification is desired.

User Search Information
+++++++++++++++++++++++

- **Username Prompt**: Label of LDAP attribute users will enter to identify
  themselves (e.g. username)
- **Base DN**: The root LDAP directory to begin the user search from
- **Username Attribute**: Attribute users will enter to identify themselves
- **ID**: Attribute used to identify user within the system
- **Email**: (Required) Attribute to map to email.
- **Name**: The user's display name

Group Search Information
++++++++++++++++++++++++

- **Base DN**: The root LDAP directory to begin the group search
- **Filter**: (Optional) Filter to apply when searching the directory
- **User Attribute**: The user field that a group uses to identify that a user
  is part of a group
- **Group Attribute**: Attribute identifying membership
- **Name Attribute**: The group's display name

The LDAP template below could be used as a starting point for adding an LDAP
connector into MetalK8s.

    .. code-block:: yaml

      connectors:
      - type: ldap
        id: ldap
        name: LDAP
        config:
          host: <ldap_host>:<ldap_port>
          # insecureNoSSL: true
          # insecureSkipVerify: true
          # startTLS: true
          rootCA: <ldap_root_ca_path>
          bindDN: <uid=serviceaccount,cn=users,dc=example,dc=com>
          bindPW: <password>

          userSearch:
            baseDN: <cn=users,dc=example,dc=com>
            filter: <"(objectClass=person)">
            username: <uid>
            idAttr: <uid>
            emailAttr: <email>
            nameAttr: <name>

          groupSearch:
            baseDN: <cn=groups,dc=freeipa,dc=example,dc=com>
            filter: <"(objectClass=group)">
            userAttr: <uid>
            groupAttr: <member>
            nameAttr: <name>

