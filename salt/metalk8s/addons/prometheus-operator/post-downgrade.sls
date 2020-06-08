# Include here all states that should be called after downgrading

{%- set version = pillar.metalk8s.cluster_version %}

{#- The Metalk8s python-kubernetes module for listing objects is bugged for
    already released versions, The following release versions are affected:
    2.4.0, 2.4.1, 2.4.2, 2.4.3 and 2.5.0
    This issue as reported here:
    https://github.com/scality/metalk8s/issues/2592 has been fixed. We need to
    skip the PrometheusRule cleanup state for the versions mentioned above. #}

{%- set affected_versions = ['2.4.0', '2.4.1', '2.4.2', '2.4.3', '2.5.0'] %}

{%- if version not in affected_versions %}
include:
  - .post-cleanup

{%- else %}

Skipping PrometheusRule cleanup for affected version {{ version }}:
  test.succeed_without_changes: []

{%- endif %}
