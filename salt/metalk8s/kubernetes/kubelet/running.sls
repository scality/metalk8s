include:
  - .installed

Ensure kubelet running:
  service.running:
    - name: kubelet
    - enable: True
    - watch:
      - metalk8s_package_manager: Install kubelet
    - require:
      - module: Reload systemctl
