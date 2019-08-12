{%- from "metalk8s/repo/macro.sls" import repo_prefix with context %}

{%- set apiserver = 'https://' ~ pillar.metalk8s.api_server.host ~ ':6443' %}
{%- set version = pillar.metalk8s.nodes[pillar.bootstrap_id].version %}
{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}
{%- set custom_renderer =
  "jinja | kubernetes kubeconfig=" ~ kubeconfig ~ "&context=" ~ context
%}

# Init
Make sure "metalk8s-solutions" Namespace exists:
  metalk8s_kubernetes.namespace_present:
    - name: metalk8s-solutions
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Make sure "admin-uis" Namespace exists:
  metalk8s_kubernetes.namespace_present:
    - name: admin-uis
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Make sure "ui-branding" ConfigMap exists:
  metalk8s_kubernetes.configmap_present:
    - name: ui-branding
    - namespace: admin-uis
    - data:
        config.json: |
          {
            "url": "{{ apiserver }}"
          }
        theme.json: |
          {
            "brand": {"primary": "#403e40", "secondary": "#e99121"}
          }
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - require:
      - metalk8s_kubernetes: Make sure "admin-uis" Namespace exists

# Mount
Mount declared Solutions archives:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.mounted
  - saltenv: metalk8s-{{ version }}

# Configure
Prepare registry configuration for declared Solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.configured
  - saltenv: metalk8s-{{ version }}
  - require:
    - salt: Mount declared Solutions archives

# Compute information about Solutions from their ISO files
{%- set solutions_info = {} %} {# indexed by <name>-<version> #}
{%- set highest_versions = {} %} {# indexed by <name> #}
{%- for solution_iso in pillar.metalk8s.solutions.configured %}
  {%- set iso_info = salt.saltutil.cmd(
          tgt=pillar.bootstrap_id,
          fun='metalk8s.product_info_from_iso',
          kwarg={
              'path': solution_iso,
          },
      )[pillar.bootstrap_id]['ret']
  %}
  {%- set solution_name = iso_info.name | lower | replace(' ', '-') %}
  {%- set fullname = solution_name ~ "-" ~ iso_info.version %}
  {%- do solutions_info.update({
    fullname: {
      'name': solution_name,
      'version': iso_info.version,
      'iso': solution_iso,
    }
   }) %}

  {%- set highest_version = highest_versions.get(solution_name) %}
  {%- if not highest_version %}
    {%- do highest_versions.update({solution_name: iso_info.version}) %}
  {%- elif salt.pkg.version_cmp(iso_info.version, highest_version) > 0 %}
    {# TODO: study results with release tags included in the version #}
    {%- do highest_versions.update({solution_name: iso_info.version}) %}
  {%- endif %}
{%- endfor %}

# Deploy components and update ConfigMap
{%- for fullname, solution_info in solutions_info.items() %}
  {%- set was_deployed = false %}
  {%- if solution_info.version == highest_versions[solution_info.name] %}
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
                  'repository': repository
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
      )[pillar.bootstrap_id]['ret']
    %}

    {%- for crd_file in crd_files %}
      {%- set sls_content = salt.saltutil.cmd(
              tgt=pillar.bootstrap_id,
              fun='slsutil.renderer',
              kwarg={
                  'path': crd_file,
                  'default_renderer': custom_renderer
              },
          )[pillar.bootstrap_id]['ret']
      %}
Apply CRD "{{ crd_file }}" for Solution {{ fullname }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"
    - require:
      - salt: Prepare registry configuration for declared Solutions
    - require_in:
      - module: Register Solution {{ fullname }} in ConfigMap

    {%- endfor %} {# crd_file in crd_files #}

    {%- set was_deployed = true %}
  {%- endif %} {# this version is the highest for this name #}

Register Solution {{ fullname }} in ConfigMap:
  module.run:
    - metalk8s_solutions.register_solution_version:
      - name: {{ solution_info.name }}
      - version: {{ solution_info.version }}
      - archive_path: {{ solution_info.iso }}
      - deployed: {{ was_deployed }}
      - kubeconfig: {{ kubeconfig }}
      - context: {{ context }}
    - require:
      - salt: Prepare registry configuration for declared Solutions
{%- endfor %} {# fullname, solution_info in solutions_info.items() #}

# Unconfigure
Remove registry configurations for removed Solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.unconfigured
  - saltenv: metalk8s-{{ version }}

# Unmount
Unmount removed Solutions archives:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.unmounted
  - saltenv: metalk8s-{{ version }}
  require:
    - salt: Remove registry configurations for removed Solutions

# Unregister removed Solutions
# TODO: consider undeploying UI/CRDs
{%- set configured = pillar.metalk8s.solutions.configured | default([]) %}
{%- set deployed = pillar.metalk8s.solutions.deployed | default({}) %}
{%- for solution_name, versions in deployed.items() %}
  {%- for solution_info in versions %}
    {%- if solution_info.iso not in configured %}
Unregister Solution {{ solution_name }}-{{ solution_info.version }}:
  module.run:
    - metalk8s_solutions.unregister_solution_version:
      - name: {{ solution_name }}
      - version: {{ solution_info.version }}
      - kubeconfig: {{ kubeconfig }}
      - context: {{ context }}
    - require:
      - salt: Unmount removed Solutions archives
    - require_in:
      - salt: Update registry with latest Solutions

    {%- endif %}
  {%- endfor %} {# solution_info in versions #}
{%- endfor %} {# solution_name, versions in deployed.items() #}

Update registry with latest Solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.repo.installed
  - saltenv: metalk8s-{{ version }}
  - require:
    - salt: Prepare registry configuration for declared Solutions
    - salt: Remove registry configurations for removed Solutions
