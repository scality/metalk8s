Create CNI configuration file for the 'loopback' plugin:
  file.serialize:
    - name: /etc/cni/net.d/99-loopback.conf
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - formatter: json
    - dataset:
        cniVersion: "0.3.1"
        type: "loopback"
