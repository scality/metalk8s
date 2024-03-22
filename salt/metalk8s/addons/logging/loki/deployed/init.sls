{%- if pillar.addons.loki.enabled %}

include:
  - ....storageclass.deployed
  - .service-configuration
  - .loki-configuration-secret
  - .chart
  - .service
  - .datasource
  - .workaround-job-dep

{#- Due to a bug in Loki that prevent deletion of the old chunks,
    Add a CronJob to delete old chunks waiting for a proper fix #}
{%- from "metalk8s/addons/logging/loki/deployed/macro.j2" import workaround_job_spec with context %}

Create Loki Cleaner Workaround CronJob:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: batch/v1
        kind: CronJob
        metadata:
          name: loki-cleaner-wa
          namespace: metalk8s-logging
        spec:
          schedule: "@daily"
          concurrencyPolicy: Replace
          jobTemplate:
            spec:
              {{ workaround_job_spec("/var/loki/loki") | indent(14) }}
    - require:
      - sls: metalk8s.addons.logging.loki.deployed.workaround-job-dep
      - sls: metalk8s.addons.logging.loki.deployed.chart

{%- else %}

{#- NOTE: We do not delete the CSC configuration as we do not
    want to lose the configuration if the user re-enables the
    addon. #}

Ensure Loki objects does not exist:
  salt.runner:
    - name: state.orchestrate
    - pillar:
        _metalk8s_kubernetes_renderer:
          force_absent: True
    - mods:
      - metalk8s.addons.logging.loki.deployed.chart

Ensure Loki config does not exist:
  metalk8s_kubernetes.object_absent:
    - name: loki
    - namespace: metalk8s-logging
    - kind: Secret
    - apiVersion: v1
    - require:
      - salt: Ensure Loki objects does not exist

{%- set loki_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/logging/loki/config/loki.yaml', saltenv=saltenv
    )
%}
{%- set loki = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-logging', 'metalk8s-loki-config', loki_defaults
    )
%}

{%- for index in range(loki.spec.deployment.replicas) %}
Ensure loki-{{ index }} Service does not exist:
  metalk8s_kubernetes.object_absent:
    - name: loki-{{ index }}
    - namespace: metalk8s-logging
    - kind: Service
    - apiVersion: v1
    - require:
      - salt: Ensure Loki objects does not exist
    - require_in:
      - metalk8s_kubernetes: Ensure Loki datasource does not exist
{%- endfor %}

Ensure Loki datasource does not exist:
  metalk8s_kubernetes.object_absent:
    - name: loki-grafana-datasource
    - namespace: metalk8s-monitoring
    - kind: ConfigMap
    - apiVersion: v1
    - require:
      - salt: Ensure Loki objects does not exist

Ensure Loki Cleaner Workaround ClusterRoleBinding does not exist:
  metalk8s_kubernetes.object_absent:
    - name: loki-cleaner-wa
    - kind: ClusterRoleBinding
    - apiVersion: rbac.authorization.k8s.io/v1
    - require:
      - salt: Ensure Loki objects does not exist

Ensure Loki Cleaner Workaround Service Account does not exist:
  metalk8s_kubernetes.object_absent:
    - name: loki-cleaner-wa
    - namespace: metalk8s-logging
    - kind: ServiceAccount
    - apiVersion: v1
    - require:
      - salt: Ensure Loki objects does not exist
      - metalk8s_kubernetes: Ensure Loki Cleaner Workaround ClusterRoleBinding does not exist

Ensure Loki Cleaner Workaround CronJob does not exist:
  metalk8s_kubernetes.object_absent:
    - name: loki-cleaner-wa
    - namespace: metalk8s-logging
    - kind: CronJob
    - apiVersion: batch/v1
    - require:
      - salt: Ensure Loki objects does not exist
      - metalk8s_kubernetes: Ensure Loki Cleaner Workaround Service Account does not exist

{%- endif %}
