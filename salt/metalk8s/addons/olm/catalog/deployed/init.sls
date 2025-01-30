include:
  - metalk8s.addons.olm.deployed
  - .cluster-catalog

Wait for Cluster Catalog to be Serving:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_olm.check_clustercatalog_serving("metalk8s-catalog-source")
    - comment: Wait for ClusterCatalog to be Ready
    - retry:
        attempts: 30
    - require:
      - test: Wait for the Operator Controller Controller Manager Deployment to be Ready
      - sls: metalk8s.addons.olm.catalog.deployed.cluster-catalog
