include:
  - .installed

Ensure kubelet running:
  service.running:
    - name: kubelet
    - enable: True
    - require:
      - pkg: Install kubelet
