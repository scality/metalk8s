{%- from "metalk8s/map.jinja" import image_cache with context %}

{#- Removes the archives a 134 bootstrap wrote flat at the root of the cache.
    Every boot cache now lives in a directory of its own, which the image cache
    agent removes once no resource declares it. The agent never removes a
    regular file at the root, so nothing else would free these.

    Only the root: `file.tidied` walks the whole tree and would empty the
    directories of the agent.

    TODO: to be removed in development/137.0, along with its state in
    `orchestrate/upgrade/post.sls`: 137 only upgrades from 136, whose
    post-upgrade already ran this. #}

{%- set flat_archives = salt.file.find(
        image_cache.directory, maxdepth=1, type='f', name='*.tar'
    ) %}

{%- for archive in flat_archives | sort %}

Remove the flat archive {{ archive }}:
  file.absent:
    - name: {{ archive }}

{%- else %}

No flat archive in the image cache:
  test.succeed_without_changes

{%- endfor %}
