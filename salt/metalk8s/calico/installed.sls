# TODO: Configure and use local repo
Install calico-cni-plugin:
  pkg.installed:
    - sources:
      - calico-cni-plugin: /srv/scality/{{ saltenv }}/packages/scality-el7/x86_64/calico-cni-plugin-3.5.1-1.el7.x86_64.rpm
