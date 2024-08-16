include:
  - .crds
  - .olm
  - .catalog

Wait for the OLM Operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=olm-operator, namespace=olm)
    - comment: Wait for the OLM Operator to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.operators.olm.deployed.olm

Wait for the Catalog Operator to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=catalog-operator, namespace=olm)
    - comment: Wait for the Catalog Operator to be Ready
    - retry:
        attempts: 30
    - require:
      - sls: metalk8s.operators.olm.deployed.olm

Wait for the PackageServer CSV to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_olm.check_csv_ready(
        name=packageserver, namespace=olm)
    - comment: Wait for the PackageServer CSV to be Ready
    - retry:
        attempts: 30
        splay: 10
    - require:
      - sls: metalk8s.operators.olm.deployed.olm
      - test: Wait for the OLM Operator to be Ready
      - test: Wait for the Catalog Operator to be Ready

Wait for the PackageServer Deployment to be Ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_object_ready(
        apiVersion=apps/v1, kind=Deployment,
        name=packageserver, namespace=olm)
    - comment: Wait for the PackageServer Deployment to be Ready
    - retry:
        attempts: 30
    - require:
      - test: Wait for the PackageServer CSV to be Ready
