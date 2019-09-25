{%- from "metalk8s/repo/macro.sls" import repo_prefix with context %}

{%- set apiserver = 'https://' ~ pillar.metalk8s.api_server.host ~ ':6443' %}
{%- set version = pillar.metalk8s.nodes[pillar.bootstrap_id].version %}
{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}
{%- set custom_renderer =
  "jinja | kubernetes kubeconfig=" ~ kubeconfig ~ "&context=" ~ context
%}
{%- set configured = pillar.metalk8s.solutions.configured | default([]) %}
{%- set deployed = pillar.metalk8s.solutions.deployed | default({}) %}


# Configure
Prepare registry configuration for declared Solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.configured
  - saltenv: metalk8s-{{ version }}

# Compute information about Solutions from their ISO files
{%- set solutions_info = {} %} {# indexed by <name>-<version> #}
{%- set highest_versions = {} %} {# indexed by <name> #}
{%- for solution_iso in configured %}
  {%- set iso_info = salt.saltutil.cmd(
          tgt=pillar.bootstrap_id,
          fun='metalk8s.archive_info_from_iso',
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


# undeploy solutions
{%- set custom_absent_renderer =
  "jinja | kubernetes kubeconfig=" ~ kubeconfig ~ "&context=" ~ context ~ "&absent=True"
%}

# Undeoloy solution
# Only undeploy if this is the last deployed version
# Else the deployed version will already override the
# old k8s objects from older versions
{%- if deployed %}
{%- for solution_name, versions in deployed.items() %}
  {%- if versions|length == 1 %}
  {%- set version_info = versions[0] %}
#  {%- for version_info in versions %}
    {%- set lower_name = solution_name | lower | replace(' ', '-') %}
    {%- set fullname = lower_name ~ '-' ~ version_info.version %}
    {%- if version_info.iso not in configured %}
    # Undeploy the Admin UI
    {%- set deploy_files_list = ["deployment.yaml", "service.yaml"] %}
    {%- for deploy_file in deploy_files_list %}
      {%- set filepath = "/srv/scality/" ~ fullname ~ "/ui/" ~ deploy_file %}
      {%- set repository = repo_prefix ~ "/" ~ fullname %}
      {%- set sls_content = salt.saltutil.cmd(
              tgt=pillar.bootstrap_id,
              fun='slsutil.renderer',
              kwarg={
                  'path': filepath,
                  'default_renderer': custom_absent_renderer,
                  'repository': repository
              },
          )[pillar.bootstrap_id]['ret']
      %}

Delete Admin UI "{{ deploy_file }}" for Solution {{ fullname }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"
    - require:
      - salt: Prepare registry configuration for declared Solutions

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
                  'default_renderer': custom_absent_renderer
              },
          )[pillar.bootstrap_id]['ret']
      %}
Delete CRD "{{ crd_file }}" for Solution {{ fullname }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"

     {%- endfor %} {# crd_file in crd_files #}
    {%- endif %} {# if version_info #}
#   {%- endfor %} {# for version_info #}
   {%- endif %} {# if len() #}
  {%- endfor %} {# for solution_name #}
  
{%- endif %} {# if deployed #}


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
  - require:
    - salt: Remove registry configurations for removed Solutions

# Unregister removed Solutions
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
