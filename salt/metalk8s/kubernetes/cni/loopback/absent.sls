# Since 2.6, we no longer need the loopback CNI plugin because we are
# deploying Calico on every node.
# Here we ensure the former configuration file is absent.
# This file can safely be removed in 2.7.

Remove CNI configuration file for the 'loopback' plugin:
  file.absent:
    - name: /etc/cni/net.d/99-loopback.conf
