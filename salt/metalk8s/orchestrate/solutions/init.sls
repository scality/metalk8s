{% set version = pillar.metalk8s.nodes[pillar.bootstrap_id].version %}
{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

# Init
Make sure solutions namespace exist:
  metalk8s_kubernetes.namespace_present:
    - name: metalk8s-solutions
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Make sure UIs namespace exist:
  metalk8s_kubernetes.namespace_present:
    - name: admin-uis
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}

Make sure solutions configmap present:
  metalk8s_kubernetes.configmap_present:
    - name: metalk8s-solutions
    - namespace: metalk8s-solutions
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - require:
      - metalk8s_kubernetes: Make sure solutions namespace exist

# Mount
Mount unconfigured solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.mounted
  - saltenv: metalk8s-{{ version }}
# Configure

Configure unconfigured solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.configured
  - saltenv: metalk8s-{{ version }}

{%- set solutions_list = pillar.metalk8s.solutions.configured %}
{%- if solutions_list %}
{%- for solution_iso in solutions_list %}
{%- set iso_info = salt.saltutil.cmd(
        tgt=pillar.bootstrap_id,
        fun='metalk8s.product_info_from_iso',
        kwarg={
            'path': solution_iso,
        },
    )[pillar.bootstrap_id]['ret']
%}
# Deploy the operator
{%- set deploy_files_list = ["deployment.yaml", "service.yaml"] %}
{%- for deploy_file in deploy_files_list %}
{%- set filepath = "/srv/scality/" ~ iso_info.name ~ "-" ~ iso_info.version ~ "/ui/" ~ deploy_file %}
{%- set sls_content = salt.saltutil.cmd(
        tgt=pillar.bootstrap_id,
        fun='slsutil.renderer',
        kwarg={
            'path': filepath,
            'default_renderer': 'jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes'
        },
    )[pillar.bootstrap_id]['ret']
%}
Apply {{ deploy_file }} for solution {{ iso_info.name }} {{ iso_info.version }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"
{%- endfor %}

{%- set crdpath = "/srv/scality/" ~ iso_info.name ~ "-" ~ iso_info.version ~ "/operator/deploy/crds" %}
{%- set crd_files = salt.saltutil.cmd(
        tgt=pillar.bootstrap_id,
        fun='file.find',
        kwarg={
          'path': crdpath,
          'name': '*_crd.yaml'
        },
  )[pillar.bootstrap_id]['ret']
%}
Test for crds {{ crd_files}}:
  test.succeed_without_changes

{%- for crd_file in crd_files %}
{%- set sls_content = salt.saltutil.cmd(
        tgt=pillar.bootstrap_id,
        fun='slsutil.renderer',
        kwarg={
            'path': crd_file,
            'default_renderer': 'jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes'
        },
    )[pillar.bootstrap_id]['ret']
%}
Apply {{ crd_file }} for solution {{ iso_info.name }} {{ iso_info.version }}:
  module.run:
    - state.template_str:
      - tem: "{{ sls_content | yaml }}"
{%- endfor %}

Update configmap solutions for {{ solution_iso }} {{ iso_info.version }}:
  module.run:
    - metalk8s_solutions.set_configured:
      - iso_info: {{ iso_info }}
      - solution_iso: {{ solution_iso }}
      - kubeconfig: {{ kubeconfig }}
      - context: {{ context }}
{%- endfor %}
{%- endif %}


Update registry for unconfigured solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.repo.installed
  - saltenv: metalk8s-{{ version }}
# Unconfigure
Unconfigure removed solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.unconfigured
  - saltenv: metalk8s-{{ version }}
# Unmount
Unmount unconfigured solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.unmounted
  - saltenv: metalk8s-{{ version }}
# update configmap
{%- set desired_soltions_list = pillar.metalk8s.solutions.configured or [] %}
{%- set existent_solutions_dict = pillar.metalk8s.solutions.deployed %}
{%- if existent_solutions_dict %}
{%- for _, solution in existent_solutions_dict.items() %}
  {%- if solution.iso not in desired_soltions_list %}
    # Solution already desired_soltions_list, unmount it now
Update configmap solutions for {{ solution.name }}:
  module.run:
    - metalk8s_solutions.set_unconfigured:
      - solution: {{ solution }}
      - kubeconfig: {{ kubeconfig }}
      - context: {{ context }}
  {%- else %}
Solution {{ solution.name }} remains:
  test.succeed_without_changes:
    - name: {{ solution.name }} remains
  {%- endif %}
{%- endfor %}
{%- endif %}
Update registry for un/configured solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.repo.installed
  - saltenv: metalk8s-{{ version }}
