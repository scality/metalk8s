# CHANGELOG

## Release 2.5.0 (in development)

### Breaking changes
- Basic authentication has been deprecated in favour of OpenID Connect (OIDC)
  with Dex being deployed as a local Identity Provider, used by Kubernetes
  API and Grafana.

  This implies:
    - The existing users defined for Kubernetes API Basic Auth in
      (`/etc/kubernetes/htpasswd`) and for the Grafana admin will become
      unusable
    - A default admin user will be created in Dex, with the new
      credentials `admin@metalk8s.invalid`:`password` which can be used to
      access the MetalK8s UI and Grafana
    - Procedures to edit and add new users can now be found
      [here](https://metal-k8s.readthedocs.io/en/development-2.5/operation/account_administration.html)

- A new framework for persisting Cluster and Services Configurations (CSC) has
  been added to ensure configurations set by administrators are not lost during
  upgrade or downgrade and can be found [here](https://metal-k8s.readthedocs.io/en/development-2.5/developer/architecture/configurations.html).

  - User-provided configuration is now stored in ConfigMaps, and MetalK8s
    tooling will honor the values provided when deploying its services:
      - Dex uses `metalk8s-auth/metalk8s-dex-config`
      - Grafana uses `metalk8s-monitoring/metalk8s-grafana-config`
      - Prometheus uses `metalk8s-monitoring/metalk8s-prometheus-config`
      - Alertmanager uses `metalk8s-monitoring/metalk8s-alertmanager-config`

  - Documentation for changing and applying configuration values is
    found [here](https://metal-k8s.readthedocs.io/en/development-2.5/operation/cluster_and_service_configuration.html).

    Note that any configuration applied on other Kubernetes objects
    (e.g. a configuration Secret that Alertmanager uses, or the
    Deployment of Grafana) will be lost upon upgrade, and admins
    should make sure to prepare the relevant ConfigMaps from their
    existing configuration before upgrading to this version.

- The MetalK8s [UI](https://metal-k8s.readthedocs.io/en/development-2.5/installation/services.html#metalk8s-gui)
  has been re-branded with lots of changes to the Login screens and Navbar to
  offer a smoother experience.

### Features Added
- Upgrade Calico to 3.12.0 (PR [#2253](https://github.com/scality/metalk8s/pull/2253))

- [#2007](https://github.com/scality/metalk8s/issues/2007) - Deploy Dex in a
MetalK8s cluster from stable Helm Charts
(PR [#2025](https://github.com/scality/metalk8s/pull/2025))

- [#2015](https://github.com/scality/metalk8s/issues/2015) - Configure MetalK8s
UI to require authentication through Dex (OIDC)
(PR [#2042](https://github.com/scality/metalk8s/pull/2042))

- [#2016](https://github.com/scality/metalk8s/issues/2016) - Brand the Dex GUI
to match MetalK8s UI specifications
(PR [#2062](https://github.com/scality/metalk8s/pull/2062))

- [#2072](https://github.com/scality/metalk8s/issues/2072) - Remove support
for Kubernetes API server basic authentication
(PR [#2119](https://github.com/scality/metalk8s/pull/2119))

- [#2078](https://github.com/scality/metalk8s/issues/2078) - Store Dex
authentication access_token in the browser localStorage
(PR [#2088](https://github.com/scality/metalk8s/pull/2088))

- [#2255](https://github.com/scality/metalk8s/issues/2255) - Template and store
replicas count for Prometheus, Grafana & Alertmanager as service configurations
(PR [#2258](https://github.com/scality/metalk8s/pull/2258))

- [#2261](https://github.com/scality/metalk8s/issues/2261) - Template and store
Dex backend settings as service configurations
(PR [#2274](https://github.com/scality/metalk8s/pull/2274))

- [#2262](https://github.com/scality/metalk8s/issues/2262) - Template and store
Alertmanager Secret as a service configuration
(PR [#2289](https://github.com/scality/metalk8s/pull/2289))

- [#2328](https://github.com/scality/metalk8s/issues/2328) - Bump K8S version
to 1.16.8 (PR [#2363](https://github.com/scality/metalk8s/pull/2363))

- Enable OIDC based authentication for Grafana service
(PR [#2378](https://github.com/scality/metalk8s/pull/2378))

### Documentation
- [#2351](https://github.com/scality/metalk8s/issues/2351) - Update
documentation with default credentials for Metalk8s UI and Grafana UI
(PR [#2377](https://github.com/scality/metalk8s/pull/2377))

- [#2264](https://github.com/scality/metalk8s/issues/2264) - Add documentation
on the list of Cluster and Service configurations
(PR [#2291](https://github.com/scality/metalk8s/pull/2291))
