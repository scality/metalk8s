{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.addons.solutions.deployed

{%- set kubernetes_present_renderer = "jinja | metalk8s_kubernetes" %}
{%- set kubernetes_absent_renderer =
      kubernetes_present_renderer ~ " absent=True" %}

{%- set ui_relpath = "ui" %}
{%- set ui_files = ["deployment.yaml", "service.yaml"] %}
{%- set crds_relpath = "operator/deploy/crds" %}
{%- set crds_name_pattern = "*_crd.yaml" %}

{# Operation macros #}
{%- macro manipulate_solution_components(solution, present=true) %}
  {%- if present %}
    {%- set action = "Apply" %}
    {%- set renderer = kubernetes_present_renderer %}
  {%- else %}
    {%- set action = "Remove" %}
    {%- set renderer = kubernetes_absent_renderer %}
  {%- endif %}

  {# CRDs management #}
  {# TODO: consider API version changes #}
  {%- set crds_path = salt.file.join(solution.mountpoint, crds_relpath) %}
  {%- set crd_files = salt.saltutil.cmd(
          tgt=pillar.bootstrap_id,
          fun='file.find',
          kwarg={
            'path': crds_path,
            'name': crds_name_pattern,
          },
        )[pillar.bootstrap_id]['ret'] %}

  {%- for crd_file in crd_files %}
    {%- set sls_content = salt.saltutil.cmd(
            tgt=pillar.bootstrap_id,
            fun='slsutil.renderer',
            kwarg={
                'path': crd_file,
                'default_renderer': renderer,
            },
          )[pillar.bootstrap_id]['ret'] %}
{{ action }} CRD "{{ crd_file }}" for Solution {{ solution.name }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"

  {%- endfor %} {# crd_file in crd_files #}

  {# TODO: StorageClasses, Grafana dashboards, ... #}
{%- endmacro %}

{# TODO: this can be improved using the state module from #1713 #}
{%- macro deploy_solution_components(solution) %}
  {{ manipulate_solution_components(solution, present=true) }}
{%- endmacro %}

{# TODO: only retrieve object names and delete them without the renderer #}
{%- macro remove_solution_components(solution) %}
  {{ manipulate_solution_components(solution, present=false) }}
{%- endmacro %}

{# Helpers #}
{%- macro fail_missing_solution(name) %}
Cannot deploy components for Solution {{ name }}:
  test.fail_without_changes:
    - name: No version for Solution {{ name }} available

{%- endmacro %}

{%- macro fail_missing_version(name, version) %}
Cannot deploy desired version '{{ version }}' for Solution {{ name }}:
  test.fail_without_changes:
    - name: Solution {{ name }}-{{ version }} is not available

{%- endmacro %}

{%- macro get_latest(versions) %}
  {# NOTE: would need Jinja 2.10 to have namespace objects #}
  {%- set ns = {'candidate': none} %}
  {%- for version in versions | map(attribute='version') %}
    {%- if ns.candidate is none %}
      {%- do ns.update({'candidate': version}) %}
    {%- elif salt.pkg.version_cmp(version, ns.candidate) > 0 %}
      {%- do ns.update({'candidate': version}) %}
    {%- endif %}
  {%- endfor -%}
  {{ ns.candidate if ns.candidate is not none else '' }}
{%- endmacro %}

{# Actual state formula #}
{%- if '_errors' in pillar.metalk8s.solutions %}
Cannot proceed with deployment of Solution cluster-wide components:
  test.configurable_test_state:
    - name: Cannot proceed due to pillar errors
    - changes: False
    - result: False
    - comment: "Errors: {{ pillar.metalk8s.solutions._errors | join('; ') }}"

{%- else %}
  {# Dict of (name, version) pairs, where version can be set to 'latest' #}
  {%- set desired = pillar.metalk8s.solutions.config.active %}
  {%- set available = pillar.metalk8s.solutions.available %}

  {%- for name, versions in available.items() %}
    {%- set desired_version = desired.get(name) %}
    {%- if desired_version == 'latest' %}
      {%- set desired_version = get_latest(versions) | trim %}
    {%- endif %}

    {%- if not desired_version %}
      {# Solution is not present in config.active #}
      {%- set active_versions = versions
                                | selectattr('active', 'equalto', true)
                                | list %}
      {%- if active_versions %}
        {# There should only be one #}
        {%- set solution = active_versions | first %}
        {{- remove_solution_components(solution) }}
      {%- endif %}
    {%- else %}
      {%- if desired_version not in versions | map(attribute='version') %}
        {{- fail_missing_version(name, desired_version) }}
      {%- else %}
        {%- set solution = versions
                           | selectattr('version', 'equalto', desired_version)
                           | first %}
        {{- deploy_solution_components(solution) }}
      {%- endif %}
    {%- endif %}

    {# Prepare list of available versions to set in the ConfigMap #}
    {%- set updated_versions = [] %}
    {%- for version in versions %}
      {%- set updated_version = version %}
      {# `active` will always be false if `desired_version` is None or doesn't
         match any available version #}
      {%- do updated_version.update({
        'active': version.version == desired_version
      }) %}
      {%- do updated_versions.append(updated_version)%}
    {%- endfor %}

Update metalk8s-solutions ConfigMap for Solution {{ name }}:
  metalk8s_kubernetes.object_updated:
    - name: metalk8s-solutions
    - namespace: metalk8s-solutions
    - kind: ConfigMap
    - apiVersion: v1
    - patch:
        data:
          {{ name }}: >-
            {{ updated_versions | tojson }}

  {%- endfor %}

  {%- for name in desired | difference(available) %}
    {{- fail_missing_solution(name) }}
  {%- endfor %}

{%- endif %} {# _errors in pillar #}
