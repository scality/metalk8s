{%- from "metalk8s/map.jinja" import repo with context %}

{%- set env_name = pillar.orchestrate.env_name %}

{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

{%- macro deploy_operator(environment, solution) %}
  {%- set namespace = environment.namespaces | first %}
  {%- set solution_id = solution.name | lower | replace(' ', '-') %}
Apply ServiceAccount for Operator of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/service_account.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        namespace: {{ namespace }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Apply Role for Operator of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/role.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        namespace: {{ namespace }}
        custom_api_groups: {{ solution.config.customApiGroups }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Apply RoleBinding for Operator of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/role_binding.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        namespace: {{ namespace }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - require:
        - metalk8s_kubernetes: Apply ServiceAccount for Operator of Solution {{ solution.name }}
        - metalk8s_kubernetes: Apply Role for Operator of Solution {{ solution.name }}

{# Store info for image repositories in some Operator ConfigMap
   TODO: add documentation about this file #}
Apply Operator ConfigMap for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/configmap.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        namespace: {{ namespace }}
        registry: {{ repo.registry_endpoint }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Apply Operator Deployment for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/operator.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        version: {{ solution.version }}
        namespace: {{ namespace }}
        image_name: {{ solution.config.operator.image.name }}
        image_tag: {{ solution.config.operator.image.tag }}
        repository: {{ repo.registry_endpoint ~ '/' ~ solution.id }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - require:
        - metalk8s_kubernetes: Apply RoleBinding for Operator of Solution {{ solution.name }}
        - metalk8s_kubernetes: Apply Operator ConfigMap for Solution {{ solution.name }}

{%- endmacro %}

{%- macro deploy_admin_ui(environment, solution) %}
  {%- set solution_id = solution.name | lower | replace(' ', '-') %}
  {%- set namespace = environment.namespaces | first %}
Apply ConfigMap for UI of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/ui/configmap.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        version: {{ solution.version }}
        namespace: {{ namespace }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Apply Deployment for UI of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/ui/deployment.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        version: {{ solution.version }}
        namespace: {{ namespace }}
        image_name: {{ solution.config.ui.image.name }}
        image_tag: {{ solution.config.ui.image.tag }}
        repository: {{ repo.registry_endpoint ~ "/" ~ solution.id }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Apply Service for UI of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/ui/service.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        namespace: {{ namespace }}
        version: {{ solution.version }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Apply Ingress for UI of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/ui/service.yaml
    - template: jinja
    - defaults:
        solution: {{ solution_id }}
        namespace: {{ namespace }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

{%- endmacro %}

{%- if '_errors' in pillar.metalk8s.solutions.environments %}
Cannot proceed with preparation of environment {{ env_name }}:
  test.configurable_test_state:
    - name: Cannot proceed due to pillar errors
    - changes: False
    - result: False
    - comment: "Errors: {{ pillar.metalk8s.solutions._errors | join('; ') }}"

{%- else %}
  {%- set environment =
          pillar.metalk8s.solutions.environments.get(env_name) %}
  {%- if environment is none %}
Cannot prepare environment {{ env_name }}:
  test.fail_without_changes:
    - name: Environment {{ env_name }} does not exist

  {%- else %}
    {%- set env_config = environment.get('config', {}) %}
    {%- if env_config %}
      {%- for name, version in env_config.items() %}
        {%- set available_versions = available.get(name, []) %}
        {%- if not available_versions %}
Cannot deploy Solution {{ name }} for environment {{ env_name }}:
  test.fail_without_changes:
    - name: Solution {{ name }} is not available

        {%- elif version not in available_versions
                                | map(attribute='version') %}
Cannot deploy Solution {{ name }}-{{ version }} for environment {{ env_name }}:
  test.fail_without_changes:
    - name: Version {{ version }} is not available for Solution {{ name }}

        {%- else %}
          {%- set solution = versions
                             | selectattr('version', 'equalto', version)
                             | first %}
          {{- deploy_operator(environment, solution) }}
          {{- deploy_admin_ui(environment, solution) }}
        {%- endif %}
      {%- endfor %} {# name, version in env_config #}
    {%- else %}
No Solution configured for environment {{ env_name }}:
  test.succeed_without_changes:
    - name: >-
        ConfigMap 'metalk8s-environment' for environment {{ env_name }}
        is absent or empty

    {%- endif %} {# env_config is empty #}
  {%- endif %} {# environment is none #}
{%- endif %}
