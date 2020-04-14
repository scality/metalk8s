
Account Administration
======================

This section highlights **MetalK8s Account Administration** which covers
user authentication, identity management and access control.

User Authentication and Identity management
-------------------------------------------

Identity management and user authentication in MetalK8s is driven by the
integration of `kube-apiserver` and Dex (an OIDC provider).

Kubernetes API enables OpenID Connect (OIDC) as one authentication strategy
(it also supports certificate-based authentication) by trusting Dex as an
OIDC Provider.

Dex can authenticate users against:

   - a static user store (stored in configuration)
   - a connector-based interface, allowing to plug in external such as LDAP,
     SAML, GitHub, Active Directory and others.

MetalK8s OIDC based Services
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

MetalK8s out of the box enables OpenID Connect (OIDC) based authentication for
its UI and Grafana service.

.. _ops-grafana-admin:

Administering Grafana and MetalK8s UI
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

A fresh installation of MetalK8s has its UI and Grafana service with default
login credentials as: ``admin@metalk8s.invalid`` / ``password``.

This default user is defined in Dex configuration as a static user, to
allow MetalK8s administrators first time access to these services. It is
recommended that MetalK8s administrators change the default password.

.. note::

   The MetalK8s UI and Grafana are both configured to use OIDC as
   an authentication mechanism, and trust Dex as a Provider. Changing
   the Dex configuration, including the default credentials, will impact
   both UIs.

For information on how to access the MetalK8s UI, please refer to
:ref:`this procedure <installation-services-admin-ui>`

For information on how to access the Grafana service, please refer to
:ref:`this procedure <installation-services-grafana>`


Add new static user
^^^^^^^^^^^^^^^^^^^

To add a new static user for either the MetalK8s UI and/or Grafana service,
refer to :ref:`this procedure <Add-dex-static-user>`

Change static user password
^^^^^^^^^^^^^^^^^^^^^^^^^^^

To change the default password for the MetalK8s UI and/or Grafana service,
refer to :ref:`this procedure <Change-dex-static-user-password>`

.. todo::

   Add documentation on the following

   - Dex connectors

   - How to add a new connector (LDAP, AD, SAML)
