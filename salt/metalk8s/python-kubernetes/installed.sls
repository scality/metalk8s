include:
  - metalk8s.repo

Install Python Kubernetes client:
  pkg.installed:
    - name: python2-kubernetes
    - reload_modules: true
