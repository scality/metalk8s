include:
  - metalk8s.addons.solutions.deployed

{# Operation macros #}
{%- macro deploy_solution_components(solution) %}
  {%- set full_name = solution.name ~ '-' ~ solution.version %}
  {%- set mount_path = "/srv/scality/" ~ full_name %}

  # Deploy the Admin UI
  {%- set deploy_files_list = ["deployment.yaml", "service.yaml"] %}
  {%- for deploy_file in deploy_files_list %}
    {%- set filepath = "/srv/scality/" ~ fullname ~ "/ui/" ~ deploy_file %}
    {%- set repository = repo_prefix ~ "/" ~ fullname %}
    {%- set sls_content = salt.saltutil.cmd(
          tgt=pillar.bootstrap_id,
          fun='slsutil.renderer',
          kwarg={
            'path': filepath,
            'default_renderer': custom_renderer,
            'repository': repository,
          },
        )[pillar.bootstrap_id]['ret']
    %}
Apply Admin UI "{{ deploy_file }}" for Solution {{ fullname }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"
    - require:
      - salt: Prepare registry configuration for declared Solutions
    - require_in:
      - module: Register Solution {{ fullname }} in ConfigMap

  {%- endfor %} {# deploy_file in deploy_files_list #}

  # Deploy the CRDs
  {%- set crds_path = "/srv/scality/" ~ fullname ~ "/operator/deploy/crds" %}
  {%- set crd_files = salt.saltutil.cmd(
          tgt=pillar.bootstrap_id,
          fun='file.find',
          kwarg={
            'path': crds_path,
            'name': '*_crd.yaml'
          },
        )[pillar.bootstrap_id]['ret'] %}

  {%- for crd_file in crd_files %}
    {%- set sls_content = salt.saltutil.cmd(
            tgt=pillar.bootstrap_id,
            fun='slsutil.renderer',
            kwarg={
                'path': crd_file,
                'default_renderer': custom_renderer
            },
          )[pillar.bootstrap_id]['ret'] %}
Apply CRD "{{ crd_file }}" for Solution {{ fullname }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"
    - require:
      - salt: Prepare registry configuration for declared Solutions
    - require_in:
      - module: Register Solution {{ fullname }} in ConfigMap

    {%- endfor %} {# crd_file in crd_files #}
{%- endmacro %}

{%- macro remove_solution_components(solution) %}
{# TODO: !!! #}
{%- endmacro %}

{%- macro fail_missing_version(name, version) %}
Cannot deploy desired version '{{ version }}' for Solution {{ name }}:
  test.fail_without_changes:
    - name: Solution {{ name }}-{{ version }} is not available

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
    {%- set desired_version = desired.get('name') %}
    {%- if desired_version == 'latest' %}
      {%- set desired_version = get_latest(versions) %}
    {%- endif %}

    {%- if desired_version is none %}
      {# Solution is not present in config.active #}
      {{- remove_solution_components(name) }}
    {%- else %}
      {%- if desired_version not in versions | attr('version') %}
        {{- fail_missing_version(name, desired_version) }}
      {%- else %}
        {%- set solution = versions
                           | selectattr('version', 'equalto', desired_version)
                           | first %}
        {{- deploy_solution_components(solution) }}
      {%- endif %}
    {%- endif %}
  {%- endfor %}

{%- endif %} {# _errors in pillar #}