#! metalk8s_kubernetes absent=True

# This 'state' cleans up things that *used* to be deployed through `chart.sls`
# when using some older version of the Chart, but are no longer in place when
# using some newer version.
# Note: when an even newer version introduces this object again, the
# corresponding entry may need to be removed here...

---
apiVersion: extensions/v1beta1
kind: PodSecurityPolicy
metadata:
  name: prometheus-operator-grafana-test
  namespace: metalk8s-monitoring
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-operator-grafana-test
  namespace: metalk8s-monitoring
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus-operator-grafana-test
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: prometheus-operator-grafana-test
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prometheus-operator-grafana-test
  namespace: metalk8s-monitoring
---
