[WIP]
using: [OLM Catalog documentation](https://olm.operatorframework.io/docs/tasks/creating-a-catalog/#catalog-creation-with-raw-file-based-catalogs)
also read: 
 - [Operator Framework Bundles](https://docs.openshift.com/container-platform/4.10/operators/understanding/olm-packaging-format.html#olm-bundle-format_olm-packaging-format)
 - [How to Bundle](https://olm.operatorframework.io/docs/tasks/creating-operator-bundle/)
cert-manager from: [operatorhubio](https://github.com/k8s-operatorhub/community-operators/tree/main)

[HOW TO ADD AN OPERATOR]
## Pre-requisites
 - [opm](https://github.com/operator-framework/operator-registry)
 - docker or podman

## How-to

### Add a Package
 - create `catalog/<package_name>` folder with a README.md
 - run `echo README.md > catalog/<package_name>/.ignoreindex`
 - run:
   ```bash
   opm init <operator_name> --default-channel=stable \
     --description=./catalog/<package_name>/README.md -o yaml > ./catalog/<package_name>/package.yaml
   ```
 - add a channel using this template:
   ```yaml
   ---
   schema: olm.channel
   package: <package_name>
   name: stable
   entries:
     - name: <package_name>:<version>
   ```
   to `catalog/<package_name>/channel.yaml`
 - add at least one version from a bundle, [cf.](../metalk8s-olm-bundles/README.md)
 - render some bundle data from the image:
   ```bash
   opm render <registry>/<package_name>-bundle:<version> -o yaml > ./catalog/<package_name>/bundles.yaml
   ```
 - NB: you can use --http and --skip-tls-verify for opm render if you're using a local registry
 - NNB: the rendered yaml will still contain references to your used registry, you can replace them:
   ```bash
   opm render <registry>/<package_name>-bundle:<version> -o yaml  | sed 's/registry/metalk8s.registry.lan/g' > ./catalog/<package_name>/bundles.yaml
   ```

[HOW TO UPGRADE AN OPERATOR]
TODO
