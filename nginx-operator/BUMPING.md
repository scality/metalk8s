## instructions

### Update helm chart

from within this directory:

```
VERSION=<...> #SEMVER VERSION without the v
rm -rf helm-charts/ingress-nginx
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm fetch -d helm-charts --untar https://kubernetes.github.io/ingress-nginx/ingress-nginx --version $VERSION
git apply remove_configmap.patch
sed -i "s/^VERSION.*/VERSION ?= $VERSION/" Makefile
make bundle
```

also change `NGINX_OPERATOR_VERSION` in `buildchain/buildchain/versions.py`.

### About the patch

The ConfigMaps are managed by salt. Previously, they were automatically deleted from the manifest
after generating the chart.
If we keep them, they interfere with the salt-generated configmap.
We don't have a way to disable the configmap generation, so we patch it in the chart.
