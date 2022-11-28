{#- Due to a bug in Loki that prevent deletion of the old chunks,
    Some Loki pods might be stuck in CrashLoopBackOff because the volume is full
    Run a Job to delete old chunks before the upgrade to restore
    NOTE: This is automatically handled since 124.1.0
    So this Logic can be removed in `development/126.0` #}

{%- set loki_sts = salt.metalk8s_kubernetes.get_object(
    kind="StatefulSet",
    apiVersion="apps/v1",
    name="loki",
    namespace="metalk8s-logging"
) %}
{%- set loki_wa_job = salt.metalk8s_kubernetes.get_object(
    kind="Job",
    apiVersion="batch/v1",
    name="loki-cleaner-wa-pre-upgrade",
    namespace="metalk8s-logging"
) %}

{%- if not loki_wa_job and loki_sts and salt.pkg.version_cmp(
        loki_sts["metadata"]["labels"]["metalk8s.scality.com/version"],
        "124.1.0"
    ) == -1 %}

include:
    - .workaround-job-dep

  {%- from "metalk8s/addons/logging/loki/deployed/macro.j2" import workaround_job_spec with context %}

Create Loki Cleaner Workaround Job:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: batch/v1
        kind: Job
        metadata:
          name: loki-cleaner-wa-pre-upgrade
          namespace: metalk8s-logging
        spec:
          {{ workaround_job_spec("/data/loki") | indent(10) }}
    - require:
      - sls: metalk8s.addons.logging.loki.deployed.workaround-job-dep

{%- else %}

Nothing to do before upgrading:
  test.nop: []

{%- endif %}
