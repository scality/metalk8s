include:
  - .installed

Ensure kubelet running:
  service.running:
    - name: kubelet
    - enable: True
    - watch:
      - pkg: Install kubelet
    - require:
      - module: Reload systemctl
