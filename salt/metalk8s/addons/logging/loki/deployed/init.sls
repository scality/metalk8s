include:
  - ....storageclass.deployed
  - .service-configuration
  - .loki-configuration-secret
  - .chart
  - .service
  - .datasource
  - .workaround-job-dep

{#- Delete the Loki pre-upgrade Job since we will deploy the CronJob #}
Ensure Loki pre-upgrade Workaround Job is deleted:
  metalk8s_kubernetes.object_absent:
    - apiVersion: batch/v1
    - kind: Job
    - name: loki-cleaner-wa-pre-upgrade
    - namespace: metalk8s-logging
    - wait:
        attempts: 30
        sleep: 10
    - require:
      - sls: metalk8s.addons.logging.loki.deployed.chart

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
