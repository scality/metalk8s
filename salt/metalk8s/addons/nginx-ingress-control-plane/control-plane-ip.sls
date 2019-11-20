{# This whole block is used to "know" the Ingress external IP used by Dex.
  It will be removed once we can have a known LoadBalancer IP for Ingress. #}
{% if '_errors' in pillar.metalk8s.nodes %}
  {# Assume this is the bootstrap Node and we haven't an apiserver yet #}
  {%- set bootstrap_id = grains.id %}
{%- elif pillar.metalk8s.nodes | length <= 1 %}
  {# Only one node (or even, zero) can/should only happen during bootstrap #}
  {%- set bootstrap_id = grains.id %}
{%- else %}
  {%- set bootstrap_nodes = salt.metalk8s.minions_by_role('bootstrap') %}
  {%- if bootstrap_nodes %}
    {%- set bootstrap_id = bootstrap_nodes | first %}
  {%- else %}
    {{ raise('Missing bootstrap node') }}
  {%- endif %}
{%- endif %}

{%- if bootstrap_id is none %}
  {{ raise('Missing bootstrap Node in pillar, cannot proceed.') }}
{%- elif bootstrap_id == grains.id %}
  {%- set bootstrap_control_plane_ip = grains.metalk8s.control_plane_ip %}
{%- else %}
  {%- set bootstrap_control_plane_ip = salt['mine.get'](bootstrap_id,
   'control_plane_ip')[bootstrap_id]
  %}
{%- endif %}

{%- set ingress_control_plane = bootstrap_control_plane_ip ~ ':8443' %}
{# (end of Ingress URL retrieval) #}
