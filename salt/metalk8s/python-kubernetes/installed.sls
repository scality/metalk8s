{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

{# Install dependencies for Python Kubernetes client:
#   {{ pkg_installed(pkgs=[
#     'python34-adal',
#     'python34-certifi',
#     'python34-dateutil',
#     'python34-jwt',
#     'python34-google-auth',
#     'python34-oauthlib',
#     'python34-PyYAML',
#     'python34-requests',
#     'python34-requests-oauthlib',
#     'python34-six',
#     'python34-urllib3',
#     'python34-websocket-client'
#   ]) }}
#     - require:
#       - test: Repositories configured
#}

Install Python Kubernetes client:
  {{ pkg_installed('python34-kubernetes') }}
    - reload_modules: true
    - require:
      - test: Repositories configured
