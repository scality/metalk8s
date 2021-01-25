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
   :language: yaml
   :lines: 3-

See :ref:`csc-alertmanager-customization` to override these defaults.

Dex Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~

Dex is an Identity Provider that drives user authentication and identity
management in a MetalK8s cluster.

The default configuration values for Dex are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/dex/config/dex.yaml.j2
   :language: yaml
   :lines: 3-42,45-

See :ref:`csc-dex-customization` for Dex configuration customizations.

Grafana Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Grafana is a web interface used to visualize and analyze metrics scraped by
Prometheus, with nice graphs.

The default configuration values for Grafana are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/prometheus-operator/config/grafana.yaml
   :language: yaml
   :lines: 3-

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
   :language: yaml
   :lines: 3-


Loki Default Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~

Loki is a log aggregation system, its job is to receive logs from collectors
(fluent-bit), store them on persistent storage, then make them queryable
through its API.

The default configuration values for Loki are specified below:

.. literalinclude:: ../../salt/metalk8s/addons/logging/loki/config/loki.yaml
   :language: yaml
   :lines: 3-

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

Default configuration for Prometheus can be overridden by editing its
Cluster and Service ConfigMap ``metalk8s-prometheus-config`` in namespace
``metalk8s-monitoring`` under the key ``data.config.yaml``:

.. code-block:: shell

   root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                      edit configmap -n metalk8s-monitoring \
                      metalk8s-prometheus-config

Change Retention Time
"""""""""""""""""""""

Prometheus is deployed with a retention based on time (10d).
This value can be overriden:

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
         config:
           retention_time: 30d

.. note::

   Supported time units are y, w, d, h, m s and ms
   (years, weeks, days, hours, minutes, seconds and milliseconds).

Set Retention Size
""""""""""""""""""

Prometheus is deployed with the size-based retention disabled.
This functionality can be actived:

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
         config:
           retention_size: 10GB

.. note::

   Supported size units are B, KB, MB, GB, TB and PB.

.. warning::

   Prometheus does not take the write-ahead log (WAL) size in account to
   calculate the retention, so the actual disk consumption can be greater
   than `retention_size`. You should at least add a 10% margin to be safe.
   (i.e.: set `retention_size` to 9GB for a 10GB volume)

Both size and time based retentions can be activated at the same time.

Predefined Alert Rules Customization
""""""""""""""""""""""""""""""""""""

A subset of the predefined Alert rules can be customized, the exhaustive list
can be found :ref:`here<csc-prometheus-default-configuration>`.

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

Applying configuration
""""""""""""""""""""""

Any changes made to ``metalk8s-prometheus-config`` ConfigMap must then be
applied with Salt.

.. parsed-literal::

   root\@bootstrap $ kubectl exec --kubeconfig /etc/kubernetes/admin.conf \\
                      -n kube-system -c salt-master salt-master-bootstrap -- \\
                      salt-run state.sls \\
                      metalk8s.addons.prometheus-operator.deployed \\
                      saltenv=metalk8s-|version|

.. _csc-dex-customization:

Dex Configuration Customization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _enable-dex-static-user-store:

Enable or Disable the Static User Store
"""""""""""""""""""""""""""""""""""""""

Dex includes a local store of users and their passwords, which is enabled by
default.

.. important::

   To continue using MetalK8s OIDC (especially for MetalK8s UI and Grafana)
   in case of the loss of external identity providers, it is advised to
   keep the static user store enabled.

To disable (resp. enable) it, perform the following steps:

#. Set the ``enablePasswordDB`` configuration flag to ``false`` (resp.
   ``true``):

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmap metalk8s-dex-config -n metalk8s-auth

   .. code-block:: yaml

      # [...]
      data:
        config.yaml: |-
          apiVersion: addons.metalk8s.scality.com/v1alpha2
          kind: DexConfiguration
          spec:
            # [...]
            config:
              # [...]
              enablePasswordDB: false  # or true

#. Apply your changes:

   .. parsed-literal::

      root\@bootstrap $ kubectl exec -n kube-system -c salt-master \\
                         --kubeconfig /etc/kubernetes/admin.conf \\
                         salt-master-bootstrap -- salt-run state.sls \\
                         metalk8s.addons.dex.deployed saltenv=metalk8s-|version|

.. note::

   Dex enables other operations on static users, such as
   :ref:`Adding a Static User <add-dex-static-user>`, and
   :ref:`Changing a Static User Password <change-dex-static-user-password>`.

Additional Configurations
"""""""""""""""""""""""""

All configuration options exposed by Dex can be changed by following a similar
procedure to the ones documented above. Refer to `Dex documentation
<https://github.com/dexidp/dex/tree/v2.23.0/Documentation>`_ for an exhaustive
explanation of what is supported.

To define (or override) any configuration option, follow these steps:

#. Add (or change) the corresponding field under the ``spec.config`` key of
   the *metalk8s-auth/metalk8s-dex-config* ConfigMap:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmap metalk8s-dex-config -n metalk8s-auth

   For example, registering a client application with Dex can be done by adding
   a new entry under ``staticClients``:

   .. code-block:: yaml

      # [...]
      data:
        config.yaml: |-
          apiVersion: addons.metalk8s.scality.com/v1alpha2
          kind: DexConfiguration
          spec:
            # [...]
            config:
              # [...]
              staticClients:
              - id: example-app
                secret: example-app-secret
                name: 'Example App'
                # Where the app will be running.
                redirectURIs:
                - 'http://127.0.0.1:5555/callback'

#. Apply your changes by running:

   .. parsed-literal::

      root\@bootstrap $ kubectl exec -n kube-system -c salt-master \\
                         --kubeconfig /etc/kubernetes/admin.conf \\
                         salt-master-bootstrap -- salt-run state.sls \\
                         metalk8s.addons.dex.deployed saltenv=metalk8s-|version|

.. todo::

   Add documentation for the following:

   - External authentication (:ghissue:`2013`)

      - Configuring LDAP
      - Configuring Active Directory (AD)

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
