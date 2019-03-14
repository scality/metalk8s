{% set SALT_MINION_FILE_CLIENT_LOCAL_CONF = "/etc/salt/minion.d/99-file-client-local.conf" %}

Bootstrap salt master:
  salt.state:
    - tgt: local
    - sls: metalk8s.salt.master
    - require:
      - salt: Bootsrap registry populate

Bootstrap configure salt:
  salt.state:
    - tgt: local
    - sls: metalk8s.salt.minion.configured
    - require:
      - salt: Bootstrap salt master

Bootstrap remove minion local conf:
  file.absent:
    - name: {{ SALT_MINION_FILE_CLIENT_LOCAL_CONF }}
    - require:
      - salt: Bootstrap configure salt

Bootstrap accept keys:
  salt.state:
    - tgt: local
    - sls: metalk8s.salt.master.accept_keys
    - require:
      - file: Bootstrap remove minion local conf

Bootstrap sync all:
  salt.function:
    - name: saltutil.sync_all
    - tgt: '*'
    - kwarg:
        refresh: True
    - require:
      - salt: Bootstrap accept keys
