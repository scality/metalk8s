{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.addons.solutions.deployed.namespace

{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}
{%- set kubernetes_present_renderer =
      "jinja | kubernetes kubeconfig=" ~ kubeconfig ~ "&context=" ~ context %}
{%- set kubernetes_absent_renderer =
      kubernetes_present_renderer ~ "&absent=True" %}

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

  {# Admin UI management #}
  {%- for ui_file in ui_files %}
    {%- set filepath = salt.file.join(solution.mountpoint, ui_relpath, ui_file) %}
    {%- set repository = repo.registry_endpoint ~ "/" ~ solution.machine_id %}
    {%- set sls_content = salt.saltutil.cmd(
            tgt=pillar.bootstrap_id,
            fun='slsutil.renderer',
            kwarg={
              'path': filepath,
              'default_renderer': renderer,
              'repository': repository,
            },
          )[pillar.bootstrap_id]['ret']
    %}
{{ action }} Admin UI "{{ ui_file }}" for Solution {{ solution.display_name }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"
    - require:
      - sls: metalk8s.addons.solutions.deployed.namespace

  {%- endfor %} {# ui_file in ui_files #}

  {# CRDs management #}
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
{{ action }} CRD "{{ crd_file }}" for Solution {{ solution.display_name }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"

    {%- endfor %} {# crd_file in crd_files #}
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
  {%- endfor %}

  {%- for name in desired | difference(available) %}
    {{- fail_missing_solution(name) }}
  {%- endfor %}

{%- endif %} {# _errors in pillar #}