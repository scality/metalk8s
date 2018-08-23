You can override default values of service deployment via ansible group_vars:

Ansible let you override configuration via mutliple ways

Via group_vars directly:

:file:`{{ inventory_dir }}/group_vars/kube-master/extra_config.yml`:

    nginx_ingress_external_values:
    - rbac:
        create: False


You can also tell ansible to load static file:

:file:`{{ inventory_dir }}/config/a.yaml`:

    rbac:
      create: False

:file:`{{ inventory_dir }}/group_vars/kube-master/extra_config.yml`:

    nginx_ingress_external_values:
    - "{{ lookup('file', 'config/a.yml')|from_yaml }}"

Note: that the relative path are relative to :file:`{{ inventory_dir }}`.

As `nginx-ingress` is a list you can mix direct-based values, with lookup-based values.
