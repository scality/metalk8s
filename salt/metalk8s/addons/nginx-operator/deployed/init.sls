include:
  - metalk8s.addons.olm.deployed
  - metalk8s.addons.olm.catalog.deployed
  - .namespace
  - .rbac
  - .clusterextension

Wait for the Nginx Operator Cluster Extension to be Installed:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_olm.check_clusterextension_installed("nginx-install")
    - comment: Wait for the Nginx Operator Cluster Extension to be Installed
    - retry:
        attempts: 30
    - require:
      - test: Wait for the Operator Controller Controller Manager Deployment to be Ready
      - test: Wait for Cluster Catalog to be Serving
      - sls: metalk8s.addons.nginx-operator.deployed.namespace
      - sls: metalk8s.addons.nginx-operator.deployed.rbac
      - sls: metalk8s.addons.nginx-operator.deployed.clusterextension
