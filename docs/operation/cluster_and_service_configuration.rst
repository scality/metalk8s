Cluster and Services Configurations
===================================

This section contains information describing the list of available Cluster and
Services Configurations including procedures for customizing and applying any
given Cluster and Services Configurations.

Default Service Configurations
------------------------------

MetalK8s addons (Alertmanager, Dex, Grafana and Prometheus) ships with default
runtime service configurations required for basic service deployment.
Find below an exhaustive list of available default Service Configurations
deployed in a MetalK8s cluster.

Alertmanager Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Alertmanager handles alerts sent by Prometheus.
It takes care of deduplicating, grouping, and routing them to the correct
receiver integration such as email, PagerDuty, or OpsGenie.
It also takes care of silencing and inhibition of alerts.

The default configuration values for Alertmanager are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/prometheus-operator/config/alertmanager.yaml

See :ref:`csc-alertmanager-customization` to override these defaults.

Dex Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~

Dex is an Identity Provider that drives user authentication and identity
management in a MetalK8s cluster.

The default configuration values for Dex are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/dex/config/dex.yaml

See :ref:`csc-dex-customization` for Dex configuration customizations.

Grafana Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Grafana is a web interface used to visualize and analyze metrics scraped by
Prometheus, with nice graphs.

The default configuration values for Grafana are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/prometheus-operator/config/grafana.yaml

.. _csc-prometheus-default-configuration:

Prometheus Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Prometheus is responsible for monitoring all the applications and systems
in the MetalK8s cluster.
It scrapes and stores various metrics from these systems and then analyze them
against a set of alerting rules.
If a rule matches, Prometheus sends an alert to Alertmanager.

The default configuration values for Prometheus are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/prometheus-operator/config/prometheus.yaml


Loki Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~

Loki is a log aggregation system, its job is to receive logs from collectors
(fluent-bit), store them on persistent storage, then make them queryable
through its API.

The default configuration values for Loki are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/logging/loki/config/loki.yaml

Service Configurations Customization
------------------------------------

.. _csc-alertmanager-customization:

Alertmanager Configuration Customization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Default configuration for Alertmanager can be overridden by editing its
Cluster and Service ConfigMap ``metalk8s-alertmanager-config`` in namespace
``metalk8s-monitoring`` under the key ``data.config\.yaml``:

  .. code-block:: shell

     root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                        edit configmap -n metalk8s-monitoring \
                        metalk8s-alertmanager-config

The following documentation is not exhaustive and is just here to give
some hints on basic usage, for more details or advanced
configuration, see the official `Alertmanager documentation`_.

.. _Alertmanager documentation: https://prometheus.io/docs/alerting/configuration/

Adding inhibition rule for an alert
"""""""""""""""""""""""""""""""""""

Alert inhibition rules allow making one alert inhibit notifications for some
other alerts.

For example, inhibiting alerts with a ``warning`` severity when there is the
same alert with a ``critical`` severity.

  .. code-block:: yaml

    apiVersion: v1
    kind: ConfigMap
    data:
      config.yaml: |-
        apiVersion: addons.metalk8s.scality.com
        kind: AlertmanagerConfig
        spec:
          notification:
            config:
              inhibit_rules:
                - source_match:
                    severity: critical
                  target_match:
                    severity: warning
                  equal:
                    - alertname

Adding receivers
""""""""""""""""

Receivers allow configuring where the alert notifications are sent.

Here is a simple Slack receiver which makes Alertmanager send all
notifications to a specific Slack channel.

  .. code-block:: yaml

    apiVersion: v1
    kind: ConfigMap
    data:
      config.yaml: |-
        apiVersion: addons.metalk8s.scality.com
        kind: AlertmanagerConfig
        spec:
          notification:
            config:
              global:
                slack_api_url: https://hooks.slack.com/services/ABCDEFGHIJK
              route:
                receiver: slack-receiver
              receivers:
                - name: slack-receiver
                  slack_configs:
                    - channel: '#<your-channel>'
                      send_resolved: true

You can find documentation
`here <https://slack.com/intl/en-fr/help/articles/115005265063-Incoming-Webhooks-for-Slack>`_
to activate incoming webhooks for your Slack workspace and retrieve the
``slack_api_url`` value.

Another example, with email receiver.

  .. code-block:: yaml

    apiVersion: v1
    kind: ConfigMap
    data:
      config.yaml: |-
        apiVersion: addons.metalk8s.scality.com
        kind: AlertmanagerConfig
        spec:
          notification:
            config:
              route:
                receiver: email-receiver
              receivers:
                - name: email-receiver
                  email_configs:
                    - to: <your-address>@<your-domain.tld>
                      from: alertmanager@<your-domain.tld>
                      smarthost: <smtp.your-domain.tld>:587
                      auth_username: alertmanager@<your-domain.tld>
                      auth_identity: alertmanager@<your-domain.tld>
                      auth_password: <password>
                      send_resolved: true

There are more receivers available (PagerDuty, OpsGenie, HipChat, ...).

Applying configuration
""""""""""""""""""""""

Any changes made to ``metalk8s-alertmanager-config`` ConfigMap must then be
applied with Salt.

.. parsed-literal::

   root\@bootstrap $ kubectl exec --kubeconfig /etc/kubernetes/admin.conf \\
                      -n kube-system -c salt-master salt-master-bootstrap -- \\
                      salt-run state.sls \\
                      metalk8s.addons.prometheus-operator.deployed \\
                      saltenv=metalk8s-|version|

.. _csc-prometheus-customization:

Prometheus Configuration Customization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Predefined Alert Rules Customization
""""""""""""""""""""""""""""""""""""

A subset of the predefined Alert rules can be customized, the exhaustive list
can be found :ref:`here<csc-prometheus-default-configuration>`.

To change these Alert rules thresholds, the ``metalk8s-prometheus-config``
ConfigMap in namespace ``metalk8s-monitoring`` must be edited as follows.

.. code-block:: shell

   root@bootstrap $ kubectl edit --kubeconfig=/etc/kubernetes/admin.conf \
                      configmap -n metalk8s-monitoring \
                      metalk8s-prometheus-config

Then, add the rules you want to override under the ``data.config.yaml`` key.
For example, to change the threshold for the disk space alert
(% of free space left) from 5% to 10%, simply do:

.. code-block:: yaml

   ---
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: metalk8s-prometheus-config
     namespace: metalk8s-monitoring
   data:
     config.yaml: |-
       apiVersion: addons.metalk8s.scality.com
       kind: PrometheusConfig
       spec:
         rules:
           node_exporter:
             node_filesystem_almost_out_of_space:
               warning:
                 available: 10

The new configuration must then be applied with Salt.

.. parsed-literal::

   root\@bootstrap $ kubectl exec --kubeconfig /etc/kubernetes/admin.conf \\
                      -n kube-system -c salt-master salt-master-bootstrap -- \\
                      salt-run state.sls \\
                      metalk8s.addons.prometheus-operator.deployed \\
                      saltenv=metalk8s-|version|

Adding New Rules
""""""""""""""""

Alerting rules allow defining alert conditions based on ``PromQL``
expressions and to send notifications about these alerts to Alertmanager.

In order to add Alert rules, a new ``PrometheusRule`` manifest must be created.

.. code-block:: yaml

   ---
   apiVersion: monitoring.coreos.com/v1
   kind: PrometheusRule
   metadata:
     labels:
       app: prometheus-operator
       app.kubernetes.io/name: prometheus-operator
     name: <prometheus-rule-name>
     namespace: <namespace-name>
   spec:
     groups:
     - name: <rules-group-name>
       rules:
       - alert: <alert-rule-name>
         annotations:
           description: "some description"
           summary: "alert summary"
         expr: <PromQL-expression>
         for: 1h
         labels:
           severity: warning

Then this manifest must be applied.

.. code-block:: shell

    root@bootstrap $ kubectl --kubeconfig=/etc/kubernetes/admin.conf \
                       apply -f <path-to-the-manifest>

For more details on Alert Rules, see the official
`Prometheus alerting rules documentation`_

.. _Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

.. _csc-dex-customization:

Dex Configuration Customization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   .. _Add-dex-static-user:

Add a local static user
"""""""""""""""""""""""

Local authentication via static users is enabled by default after a fresh
MetalK8s installation.

   .. important::

      To continue using MetalK8s in cases where the external authentication
      system fails, we advise MetalK8s administrators to leave the default
      super admin account enabled at all times.

To add a new static user, perform the following operations:

   .. _Generate-password-hash:

#. Generate a bcrypt hash of your new password.

   - To generate the bcrypt hash, on the Bootstrap node, run the following.

   .. code-block:: shell

      root@bootstrap $ htpasswd -nBC 14 "" | tr -d ':'
      New password:
      Re-type new password:
      <your hash here, starting with "$2y$14$">

#. Generate a unique ``UserID`` by running the following command.

   .. code-block:: shell

      root@bootstrap $ python -c 'import uuid; print uuid.uuid4()'

#. From the Bootstrap node, edit the ConfigMap ``metalk8s-dex-config`` and then
   add a new entry using:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmaps metalk8s-dex-config -n metalk8s-auth

   The new entry should be unique and possess mandatory fields like ``email``,
   ``hash``, ``username`` and ``userID`` like in the example below.

   .. code-block:: yaml

      [...]
      data:
         config.yaml: |-
            spec:
               localuserstore:
                  userlist:
                    - email: "<email>"
                      hash: "<replace-with-hash>"
                      username: "<username>"
                      userID: "<uuidv4>"
      [...]

#. Save the ConfigMap changes.

#. From the Bootstrap node, run the following to propagate the
   changes.

   .. parsed-literal::

      root\@bootstrap $ kubectl exec -n kube-system -c salt-master \\
                         --kubeconfig /etc/kubernetes/admin.conf \\
                         salt-master-bootstrap -- salt-run \\
                         state.sls metalk8s.addons.dex.deployed saltenv=metalk8s-|version|

#. Finally, create and apply the required :file:`ClusterRoleBinding.yaml` file
   that ensures that the newly added static user is bound to a Cluster Role.

   .. note::

      MetalK8s installations come with already existing Cluster Roles.
      Administrators can create new Cluster Roles or refer to the existing
      Cluster Roles.

      To obtain the list of available Cluster Roles in a MetalK8s cluster,
      use the following command:

      .. code-block:: shell

         root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                            get clusterroles

      For more information about a Cluster Role, run the following command to
      describe it.

      .. code-block:: shell

         root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                            get clusterroles <name> -o yaml

      For starters, MetalK8s administrators can provision new users using the
      `cluster-admin` Cluster Role. Note that this Cluster Role by default
      grants cluster-wide permissions to all resources within a cluster.
      For more information refer to
      `RBAC <https://kubernetes.io/docs/reference/access-authn-authz/rbac/>`_
      documentation.


   - Use the following template to create the :file:`ClusterRoleBinding.yaml`
     file where:

      - <name> refers to any freely chosen name
      - <email> refers to the new user email as defined in step (3) above
      - <cluster-role> refers to the Cluster Role picked from the list above

   .. code-block:: yaml

      apiVersion: rbac.authorization.k8s.io/v1
      kind: ClusterRoleBinding
      metadata:
        name: <name>
      subjects:
      - kind: User
        name: <email>
        apiGroup: rbac.authorization.k8s.io
      roleRef:
        kind: ClusterRole
        name: <cluster-role>
        apiGroup: rbac.authorization.k8s.io

   - Apply the ClusterRoleBinding configurations using:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         apply -f ClusterRoleBinding.yaml

#. Verify that the user has been successfully added and you can log in to the
   MetalK8s UI using the new email and password.

.. _Change-dex-static-user-password:

Change password for local static user
"""""""""""""""""""""""""""""""""""""

To change the password of an existing user, perform the following operations:

#. Generate a bcrypt hash of the new password using
   :ref:`this procedure<Generate-password-hash>` .

#. From the Bootstrap node, edit the ConfigMap ``metalk8s-dex-config`` and then
   change the ``hash`` for the selected user:

   .. note::

      **Override default Admin password**

      Newly deployed MetalK8s cluster comes provisioned with a default admin
      account. To override the password for this default admin account, perform
      the operation below specifying the email `admin@metalk8s.invalid`.
      MetalK8s will automatically override the default password with the new
      entry you have specified.

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmaps metalk8s-dex-config -n metalk8s-auth

      [..]
      config.yaml: |-
         localuserstore:
            enabled: true
            userlist:
               - email: "user@metalk8s.invalid"
                 hash: "<new-password-hash>"
                 username: "user"
                 userID: "08a8684b-db88-4b73-90a9-3cd1661f5466"
      [...]


#. Save the ConfigMap changes.

#. From the Bootstrap node, run the following to propagate the
   changes.

   .. parsed-literal::

      root\@bootstrap $ kubectl exec -n kube-system -c salt-master \\
                         --kubeconfig /etc/kubernetes/admin.conf \\
                         salt-master-bootstrap -- salt-run \\
                         state.sls metalk8s.addons.dex.deployed \\
                         saltenv=metalk8s-|version|

#. Verify that the password has been changed and you can log in to the MetalK8s
   UI using the new password

.. todo::

   Add documentation on the following tracked topics

   - Change static user password (issue #2075)

   - External authentication (issue #2013)

      - Configuring LDAP
      - Configuring Active Directory(AD)

.. _Add-new-external-identity-provider:

Add new external Identity Provider
""""""""""""""""""""""""""""""""""

#. From the Bootstrap node, edit the ConfigMap ``metalk8s-dex-config`` as
   follows

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmaps metalk8s-dex-config -n metalk8s-auth

   - Add the following mandatory fields where:

      - <oidc-client-name> refers to any chosen alphanumeric e.g Keycloak-UI
      - <redirectURIs> refers to an HTTP endpoint where the authorization code
        or tokens are sent to. It must match a registered and valid callback
        URI available on your external Identity Provider.

   .. code-block:: yaml

      [...]
      data:
         config.yaml: |-
            spec:
              externalIDP:
                staticClient:
                  name: "<oidc-client-name>"
                  redirectURIs:
                    - "<redirectURIs_1>"
                    - "<redirectURIs_2>"
      [...]

#. Save the ConfigMap changes.

#. From the Bootstrap node, run the following to propagate the
   changes.

   .. parsed-literal::

      root\@bootstrap $ kubectl exec -n kube-system -c salt-master \\
                         --kubeconfig /etc/kubernetes/admin.conf \\
                         salt-master-bootstrap -- salt-run \\
                         state.sls metalk8s.addons.dex.deployed saltenv=metalk8s-|version|

#. Verify that your configured external Identity Provider correctly redirects
   when a login request is initiated.

Loki Configuration Customization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Default configuration for Loki can be overridden by editing its
Cluster and Service ConfigMap ``metalk8s-loki-config`` in namespace
``metalk8s-logging`` under the key ``data.config.yaml``:

.. code-block:: shell

    root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                       edit configmap -n metalk8s-logging \
                       metalk8s-loki-config

The following documentation is not exhaustive and is just here to give
some hints on basic usage, for more details or advanced
configuration, see the official `Loki documentation`_.

.. _Loki documentation: https://grafana.com/docs/loki/latest/configuration/

Changing the logs retention period
""""""""""""""""""""""""""""""""""

Retention period is the time the logs will be stored and available before
getting purged.

For example, to set the retention period to 1 week, the ConfigMap must be
edited as follows:

.. code-block:: yaml

    apiVersion: v1
    kind: ConfigMap
    data:
      config.yaml: |-
        apiVersion: addons.metalk8s.scality.com
        kind: LokiConfig
        spec:
          config:
            table_manager:
              retention_period: 168h

.. note::

   Due to internal implementation, ``retention_period`` must be a multiple of
   ``24h`` in order to get the expected behavior

Replicas Count Customization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

MetalK8s administrators can scale the number of pods for any service mentioned
below by changing the number of replicas which is by default set to a single
pod per service.

..  _csc-configmaps:

   +-------------------+---------------------+------------------------------+
   | **Service**       | **Namespace**       | **ConfigMap**                |
   +-------------------+---------------------+------------------------------+
   | Alertmanager      | metalk8s-monitoring | metalk8s-alertmanager-config |
   +-------------------+                     +------------------------------+
   | Grafana           |                     | metalk8s-grafana-config      |
   +-------------------+                     +------------------------------+
   | Prometheus        |                     | metalk8s-prometheus-config   |
   +-------------------+---------------------+------------------------------+
   | Dex               | metalk8s-auth       | metalk8s-dex-config          |
   +-------------------+---------------------+------------------------------+
   | Loki              | metalk8s-logging    | metalk8s-loki-config         |
   +-------------------+---------------------+------------------------------+

To change the number of replicas, perform the following operations:

#. From the Bootstrap node, edit the ``ConfigMap`` attributed to the service
   and then modify the replicas entry.

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmap <ConfigMap> -n <Namespace>

   .. note::

      For each service, consult the :ref:`Cluster Services<csc-configmaps>`
      table to obtain the ``ConfigMap`` and the ``Namespace`` to be used for
      the above command.

   Make sure to replace **<number-of-replicas>** field with an integer value
   (For example 2).

   .. code-block:: yaml

      [...]
      data:
         config.yaml: |-
            spec:
               deployment:
                  replicas: <number-of-replicas>
      [...]

#. Save the ConfigMap changes.

#. From the Bootstrap node, execute the following command which connects to
   the Salt master container and applies salt-states to propagate the new
   changes down to the underlying services.

   .. parsed-literal::

      root\@bootstrap $ kubectl exec --kubeconfig /etc/kubernetes/admin.conf \\
                         -n kube-system -c salt-master salt-master-bootstrap \\
                         -- salt-run state.sls metalk8s.deployed \\
                         saltenv=metalk8s-|version|

   .. note::

      Scaling the number of pods for services like ``Prometheus``,
      ``Alertmanager`` and ``Loki`` requires provisioning extra persistent
      volumes for these pods to startup normally. Refer to
      :ref:`this procedure <Provision Storage for Services>`
      for more information.
