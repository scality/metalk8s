# Clean already attached loop devices before applying highstate, to avoid
# creating duplicates for a same sparse file.
# This state can cleanup either "manually", for upgrade, or by disabling the
# systemd units, for downgrade.
{%- set target_version = pillar.metalk8s.nodes[grains.id].version %}

{%- if '_errors' in pillar.metalk8s.volumes %}

Cannot proceed with volume cleanup (pillar errors):
  test.fail_without_changes:
    - comment: 'Errors: {{ pillar.metalk8s.volumes._errors | join (", ") }}'

{%- else %}
  {%- set sparse_volumes = pillar.metalk8s.volumes.values()
                         | selectattr('spec.sparseLoopDevice', 'defined')
                         | list %}

  {%- if not sparse_volumes %}

Nothing to cleanup:
  test.succeed_without_changes: []

  {%- else %}
    {%- set target_is_2_7 = salt.pkg.version_cmp(target_version, '2.7.0') >= 0 %}
    {%- if target_is_2_7 %}

include:
  - .installed

    {%- endif %}

    {%- for volume in sparse_volumes %}
      {%- set volume_name = volume.metadata.name %}
      {%- set volume_id = volume.metadata.uid %}
      {%- if target_is_2_7 %}

Cleanup loop device for Volume {{ volume_name }}:
  cmd.run:
    - name: /usr/local/libexec/metalk8s-sparse-volume-cleanup "{{ volume_id }}"
    # Only cleanup if the systemd unit doesn't exist yet (this command exits
    # with retcode 3 if the service is dead, 4 if the template does not exist)
    - unless: systemctl status metalk8s-sparse-volume@{{ volume_id }}
    - require:
      - test: Ensure Python 3 is available
      - file: Install clean-up script

      {%- else %} {# target_version < 2.7.0 #}

Disable systemd unit for Volume {{ volume_name }}:
  service.dead:
    - name: metalk8s-sparse-volume@{{ volume_id }}
    - enable: false
    - require_in:
      - file: Remove systemd template unit for sparse loop device provisioning

      {%- endif %}
    {%- endfor %}
  {%- endif %}

  {%- if not target_is_2_7 %}

Remove systemd template unit for sparse loop device provisioning:
  file.absent:
    - name: /etc/systemd/system/metalk8s-sparse-volume@.service

  {%- endif %}
{%- endif %}
