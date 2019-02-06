{%- from "metalk8s/map.jinja" import repo with context %}

include:
{%- if repo.online_mode %}
  - .online
{%- else %}
  - .offline
{%- endif %}
