{%- from "metalk8s/map.jinja" import repo with context %}

{%- set env_name = pillar.orchestrate.env_name %}
{%- set webhook_enabled = pillar.orchestrate.webhook_enabled %}

{%- macro deploy_operator(namespace, name, solution) %}

Apply ServiceAccount for Operator of Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/service_account.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        version: {{ solution.version }}

  {%- set role_manifests =
          salt['metalk8s_solutions.operator_roles_from_manifest'](
              solution.mountpoint, namespace
          )
  %}
  {%- for manifest in role_manifests %}
    {%- set role_kind = manifest.kind %}
    {%- set role_name = manifest.metadata.name %}
Apply Operator {{ role_kind }} {{ role_name }} for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - manifest: {{ manifest | tojson }}

Apply RoleBinding of {{ role_kind }} {{ role_name }} for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/role_binding.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        version: {{ solution.version }}
        role_name: {{ role_name }}
        role_kind: {{ role_kind }}
    - require:
        - metalk8s_kubernetes: Apply ServiceAccount for Operator of Solution {{ solution.name }}
        - metalk8s_kubernetes: Apply Operator {{ role_kind }} {{ role_name }} for Solution {{ solution.name }}
    - require_in:
        - metalk8s_kubernetes: Apply Operator Deployment for Solution {{ solution.name }}
  {%- endfor %}

{# Store info for image repositories in some Operator ConfigMap
   TODO: add documentation about this file #}
Apply Operator ConfigMap for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/configmap.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        registry: {{ repo.registry_endpoint }}
        version: {{ solution.version }}

{%- set metrics = solution.manifest.spec.operator.get('metrics', {}) %}
{%- set metrics_enabled = metrics.get('enabled', False) %}
{%- if metrics_enabled %}
  {%- set metrics_scheme = metrics.get('scheme', 'https') %}
  {%- set metrics_path = metrics.get('path', '/metrics') %}
  {%- if metrics_scheme == 'https' %}
    {%- set metrics_port = metrics.get('port', 8443) %}
  {%- else %}
    {%- set metrics_port = metrics.get('port', 8080) %}
  {%- endif %}
{%- endif %}

{%- if metrics_enabled %}

Apply Operator Metrics Auth ClusterRole for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/metrics_auth_clusterrole.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        version: {{ solution.version }}

Apply Operator Metrics Auth ClusterRoleBinding for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/metrics_auth_clusterrolebinding.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        version: {{ solution.version }}
    - require:
        - metalk8s_kubernetes: Apply ServiceAccount for Operator of Solution {{ solution.name }}
        - metalk8s_kubernetes: Apply Operator Metrics Auth ClusterRole for Solution {{ solution.name }}
    - require_in:
        - metalk8s_kubernetes: Apply Operator Deployment for Solution {{ solution.name }}

  {%- if metrics_scheme == 'https' %}

Apply Operator Metrics Issuer for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/metrics_issuer.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        version: {{ solution.version }}

Apply Operator Metrics Certificate for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/metrics_certificate.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        version: {{ solution.version }}
    - require:
        - metalk8s_kubernetes: Apply Operator Metrics Issuer for Solution {{ solution.name }}
    - require_in:
        - metalk8s_kubernetes: Apply Operator Deployment for Solution {{ solution.name }}

  {%- endif %}

{%- endif %}

Apply Operator Deployment for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/deployment.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        version: {{ solution.version }}
        namespace: {{ namespace }}
        image_name: {{ solution.manifest.spec.operator.image.name }}
        image_tag: {{ solution.manifest.spec.operator.image.tag }}
        repository: {{ repo.registry_endpoint ~ '/' ~ solution.id }}
        webhook_enabled: {{ webhook_enabled }}
        metrics_enabled: {{ metrics_enabled }}
{%- if metrics_enabled %}
        metrics_port: {{ metrics_port }}
        metrics_scheme: {{ metrics_scheme }}
{%- endif %}
    - require:
        - metalk8s_kubernetes: Apply Operator ConfigMap for Solution {{ solution.name }}

{%- if metrics_enabled %}

Apply Operator Metrics Service for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/metrics_service.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        version: {{ solution.version }}
        metrics_port: {{ metrics_port }}
        metrics_scheme: {{ metrics_scheme }}
    - require:
        - metalk8s_kubernetes: Apply Operator Deployment for Solution {{ solution.name }}

Apply Operator ServiceMonitor for Solution {{ solution.name }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/operator/service_monitor.yaml.j2
    - template: jinja
    - defaults:
        solution: {{ name }}
        namespace: {{ namespace }}
        version: {{ solution.version }}
        metrics_port: {{ metrics_port }}
        metrics_scheme: {{ metrics_scheme }}
        metrics_path: {{ metrics_path }}
    - require:
        - metalk8s_kubernetes: Apply Operator Metrics Service for Solution {{ solution.name }}

{%- endif %}

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
    {%- set env_namespaces = environment.get('namespaces', {}) %}
    {%- if env_namespaces %}
      {%- for namespace, ns_conf in env_namespaces.items() %}
        {%- set env_config = ns_conf.get('config', {}) %}
        {%- if env_config %}
          {%- for name, version in env_config.items() %}
            {%- set available_versions =
                    pillar.metalk8s.solutions.available.get(name, []) %}
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
              {%- set solution = available_versions
                                 | selectattr('version', 'equalto', version)
                                 | first %}

              {{- deploy_operator(namespace, name, solution) }}

            {%- endif %}
          {%- endfor %} {# name, version in env_config #}
        {%- else %}

No Solution configured in namespace {{ namespace }} for environment {{ env_name }}:
  test.succeed_without_changes:
    - name: >-
        ConfigMap 'metalk8s-environment' for environment {{ env_name }} in
        namespace {{ namespace }} is absent or empty

        {%- endif %} {# env_config is empty #}
      {%- endfor %} {# namespace, ns_conf in env_namespaces #}
    {%- else %}

No Solution configured for environment {{ env_name }}:
  test.succeed_without_changes:
    - name: >-
        ConfigMap 'metalk8s-environment' for environment {{ env_name }}
        do not exists

    {%- endif %} {# env_namespaces is empty #}
  {%- endif %} {# environment is none #}
{%- endif %}
