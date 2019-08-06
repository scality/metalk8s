{% set version = pillar.metalk8s.nodes[pillar.bootstrap_id].version %}
{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

# Init
Mount unconfigured solutions:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.solutions.prereq
  - saltenv: metalk8s-{{ version }}

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

{%- set solutions_list = pillar.metalk8s.solutions.unconfigured %}
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
Update configmap solutions for {{ solution_iso }}:
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
{%- set desired_soltions_list = pillar.metalk8s.solutions.unconfigured or [] %}
{%- set existent_solutions_dict = pillar.metalk8s.solutions.configured %}
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