include:
  - .installed

Start and enable containerd:
  service.running:
    - name: containerd
    - enable: True
    - require:
      - pkg: Install containerd
