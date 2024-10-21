# Bumping MetalK8s dependencies

Here is a short list of chart and component bumps and how to perform them

## Charts

### General Outline

All charts are in the `charts/` directory, they are usually represented
in one file and one directory:

 - `$CHART_NAME/` contains the untouched chart files fetched using helm.
 - `$CHART_NAME.yaml` our personalized helm values file.

In order to Bump this chart, one has to:

 - remove the current chart files:
   ```rm -rf charts/$CHART_NAME/```
 - add the chart's repo using helm:
   ```helm repo add $REPO_NAME $REPO_URL && helm repo update```
 - fetch the repo again:
   ```helm fetch -d charts --untar $REPO_NAME/$CHART_NAME```
 - make any necessary patches to the chart (chart-specific).
 - generate the sls state from the chart:
   ```./doit.sh codegen:chart_$CHART_NAME```

### fluent-bit

```
CHART_NAME=fluent-bit
REPO_NAME=fluent
REPO_URL=https://fluent.github.io/helm-charts
```

### cert-manager

```
CHART_NAME=cert-manager
REPO_NAME=jetstack
REPO_URL=https://charts.jetstack.io
```

### dex

```
CHART_NAME=dex
REPO_NAME=dex
REPO_URL=https://charts.dexidp.io
```

Before generating the sls, the chart file `charts/dex/templates/ingress.yaml` needs
to be patched as so (after line 3):

```
{{- $svcPort := .Values.service.ports.http.port -}}
# add these 3 lines
{{- if .Values.https.enabled -}}
  {{- $svcPort = .Values.service.ports.https.port -}}
{{- end }}
```
(cf. [opened issue](https://github.com/dexidp/helm-charts/issues/15))

### loki

```
CHART_NAME=loki
REPO_NAME=grafana
REPO_URL=https://grafana.github.io/helm-charts
```

### ingress-nginx

```
CHART_NAME=ingress-nginx
REPO_NAME=ingress-nginx
REPO_URL=https://kubernetes.github.io/ingress-nginx
```

set `$VERSION` with the appropriate value.

run

```
curl https://raw.githubusercontent.com/kubernetes/ingress-nginx/helm-chart-$VERSION/deploy/grafana/dashboards/request-handling-performance.json \
  -Lo salt/metalk8s/addons/nginx-ingress/deployed/files/ingress-nginx-performance.json
curl https://raw.githubusercontent.com/kubernetes/ingress-nginx/helm-chart-$VERSION/deploy/grafana/dashboards/request-handling-performance.json \
  -Lo salt/metalk8s/addons/nginx-ingress/deployed/files/ingress-nginx-performance.json
```

### prometheus-adapter

```
CHART_NAME=prometheus-adapter
REPO_NAME=prometheus-community
REPO_URL=https://prometheus-community.github.io/helm-charts
```

### kube-prometheus-stack

```
CHART_NAME=kube-prometheus-stack
REPO_NAME=prometheus-community
REPO_URL=https://prometheus-community.github.io/helm-charts
```

NB: thanos chart is updated at the same time

After the first failed build, rules.json and alerting_rules.json from
`$ARTIFACTS_URL/alert_rules` and place them in `tools/rule_extractor` folder.

### thanos

```
CHART_NAME=thanos
REPO_NAME=banzaicloud-stable
REPO_URL=https://kubernetes-charts.banzaicloud.com/
```

## Images

A few tips to bump image versions and SHAs:

 - bumps are done in the file `buildchain/buildchain/versions.py`.
 - the registry for an image can be found by parsing `constants.py` and `image.py`.
 - when the registry is known, the SHA for the new version can be fetched:
   ```gcrane digest $registry/$image:$tag```

## Operator-sdk and Go version

 - check [documentation](https://sdk.operatorframework.io/docs/upgrading-sdk-version/$version)
   for important changes and apply them.
 - bump version in Makefile.
 - if necessary, bump go version in pre_merge github action.
 - if necessary, bump go version in Dockerfile.
 - if necessary, bump go dependencies versions.
 - run `make metalk8s`
 - check a diff between the two latest versions of this [test project](https://github.com/operator-framework/operator-sdk/tree/master/testdata/go/v4/memcached-operator)
 - the diff in this repo and the test project should be more or less the same
