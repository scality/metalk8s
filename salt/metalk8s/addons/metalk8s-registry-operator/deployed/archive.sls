#!jinja | metalk8s_kubernetes

{#- The ISO of this version, which the bootstrap copied to the archives
    directory of the registry node agents. An agent deletes any archive no
    NodeSolutionArchive claims, and the operator creates those once both this
    and the Registry exist: create it first, so the claim comes as early as
    the agents do. #}
{%- set version = saltenv | replace("metalk8s-", "", 1) %}

apiVersion: metalk8s.scality.com/v1alpha1
kind: SolutionArchive
metadata:
  name: metalk8s-{{ version }}
spec:
  name: metalk8s
  version: "{{ version }}"
