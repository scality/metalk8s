include:
  - .installed
  - .configured

Upgrade Calico IPAM data:
  cmd.run:
    - name: /opt/cni/bin/calico-ipam -upgrade
    - env:
        - KUBERNETES_NODE_NAME: '{{ grains.id }}'
        - CALICO_NETWORKING_BACKEND: 'bird'
        - KUBECONFIG: '/etc/kubernetes/calico.conf'
    - require:
        - metalk8s_package_manager: Install calico-cni-plugin
        - metalk8s_kubeconfig: Create kubeconf file for calico
        - file: Create CNI calico configuration file
