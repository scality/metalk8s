{% set SALT_MINION_FILE_CLIENT_LOCAL_CONF = "/etc/salt/minion.d/99-file-client-local.conf" %}

include:
  - metalk8s.salt.master
  - metalk8s.salt.minion.configured
  - metalk8s.salt.master.accept_keys

Remove minion local conf:
  file.absent:
    - name: {{ SALT_MINION_FILE_CLIENT_LOCAL_CONF }}
    - require:
      - sls: metalk8s.salt.minion.configured
    - require_in:
      - sls: metalk8s.salt.mater.accept_keys
