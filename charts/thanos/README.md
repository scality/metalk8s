# Thanos Helm chart

This is a Helm Chart for Thanos. It does not include the required Prometheus and sidecar installation.

## Thanos

Thanos is a set of components that can be composed into a highly available metric system with unlimited storage capacity, which can be added seamlessly on top of existing Prometheus deployments.

Thanos leverages the Prometheus 2.0 storage format to cost-efficiently store historical metric data in any object storage while retaining fast query latencies. Additionally, it provides a global query view across all Prometheus installations and can merge data from Prometheus HA pairs on the fly.

Concretely the aims of the project are:

- Global query view of metrics.
- Unlimited retention of metrics.
- High availability of components, including Prometheus.

## Helm Chart

This chart is in **Beta** state to provide easy installation via Helm chart.
Things that we are improving in near future:
- [ ] Automatic TLS generation for communicating between in-cluster components
- [ ] Support for tracing configuration
- [ ] Grafana dashboards
- [ ] Informative NOTES.txt

## Architecture

This Chart will install a complete [Thanos](https://github.com/improbable-eng/thanos) solution. To understand how Thanos works please read it's official [Architecture design](https://github.com/improbable-eng/thanos/blob/master/docs/design.md).

## Installing the Chart

Add Banzai Cloud repository:

```bash
$ helm repo add banzaicloud-stable https://kubernetes-charts.banzaicloud.com
```

## Storage examples

### Example GCS configuration for `object-store.yaml`
```
type: GCS
config:
  bucket: "thanos"
  service_account: |-
    {
      "type": "service_account",
      "project_id": "project",
      "private_key_id": "abcdefghijklmnopqrstuvwxyz12345678906666",
      "private_key": "-----BEGIN PRIVATE KEY-----\...\n-----END PRIVATE KEY-----\n",
      "client_email": "project@thanos.iam.gserviceaccount.com",
      "client_id": "123456789012345678901",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/thanos%40gitpods.iam.gserviceaccount.com"
    }
```

### Example S3 configuration for `object-store.yaml`
This is an example configuration using thanos with S3. Check endpoints here: https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region

```
type: S3
config:
  bucket: ""
  endpoint: ""
  region: ""
  access_key: ""
  insecure: false
  signature_version2: false
  secret_key: ""
  put_user_metadata: {}
  http_config:
    idle_conn_timeout: 0s
    response_header_timeout: 0s
    insecure_skip_verify: false
  trace:
    enable: false
  part_size: 0
```

### Example Azure configuration for `object-store.yaml`

```
type: AZURE
config:
  storage_account: ""
  storage_account_key: ""
  container: ""
  endpoint: ""
  max_retries: 0
```
Create the Service Account and Bucket at Google cloud.

#### Install the chart:
```bash
helm install banzaicloud-stable/thanos --name thanos -f my-values.yaml --set-file objstoreFile=object-store.yaml

```

Visit the Bucket browser
```bash
kubectl port-forward svc/thanos-bucket 8080 &
open http://localhost:8080
```

## Install prometheus-operator

Extra configuration for prometheus operator.

> Note: Prometheus-operator and Thanos **MUST** be in the same namespace.

```yaml
prometheus:
  prometheusSpec:
    thanos:
      image: quay.io/thanos/thanos:v0.9.0
      version: v0.9.0
      objectStorageConfig:
        name: thanos
        key: object-store.yaml
```

Install prometheus-operator

```bash
helm install stable/prometheus-operator -f thanos-sidecar.yaml
```

# Configuration

This section describes the values available

## General
|Name|Description| Default Value|
|----|-----------|--------------|
| image.repository | Thanos image repository and name | 'quay.io/thanos/thanos'   **For Thanos version 0.6.0 or older change this to 'improbable/thanos'** |
| image.tag | Thanos image tag | v0.9.0 |
| image.pullPolicy | Image Kubernetes pull policy | IfNotPresent |
| objstore | Configuration for the backend object storage in yaml format. Mutually exclusive with other objstore options. | {} |
| objstoreFile | Configuration for the backend object storage in string format. Mutually exclusive with other objstore options. | "" |
| objstoreSecretOverride | Configuration for the backend object storage in an existing secret. Mutually exclusive with other objstore options.  | "" |

## Common settings for all components

These setting applicable to nearly all components.

|Name|Description| Default Value|
|----|-----------|--------------|
| $component.labels | Additional labels to the Pod | {} |
| $component.annotations | Additional annotations to the Pod | {} |
| $component.deploymentLabels | Additional labels to the deployment | {} |
| $component.deploymentAnnotations | Additional annotations to the deployment | {} |
| $component.extraEnv | Add extra environment variables | [] |
| $component.strategy | Kubernetes [deployment update strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy) object | {} |
| $component.updateStrategy | Kubernetes [statefulset update strategy](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#update-strategies) object | {} |
| $component.metrics.annotations.enabled | Prometheus annotation for component | false |
| $component.metrics.serviceMonitor.enabled | Prometheus ServiceMonitor definition for component | false |
| $component.securityContext | SecurityContext for Pod | {} |
| $component.resources | Resource definition for container | {} |
| $component.tolerations | [Node tolerations for server scheduling to nodes with taints](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/) | {} |
| $component.nodeSelector | [Node labels for compact pod assignment](https://kubernetes.io/docs/user-guide/node-selection/) | {} |
| $component.affinity | [Pod affinity](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#node-affinity) | {} |
| $component.grpc.port | grpc listen port number | 10901 |
| $component.grpc.service.annotations | Service definition for grpc service | {} |
| $component.grpc.service.matchLabels | Pod label selector to match grpc service on. | `{}` |
| $component.grpc.ingress.enabled | Set up ingress for the grpc service | false |
| $component.grpc.ingress.defaultBackend | Set up default backend for ingress | false |
| $component.grpc.ingress.annotations | Add annotations to ingress | {} |
| $component.grpc.ingress.labels | Add labels to ingress | {} |
| $component.grpc.ingress.path | Ingress path | "/" |
| $component.grpc.ingress.hosts | Ingress hosts | [] |
| $component.grpc.ingress.tls | Ingress TLS configuration | [] |
| $component.http.port | http listen port number | 10902 |
| $component.http.service.annotations | Service definition for http service | {} |
| $component.http.service.matchLabels | Pod label selector to match http service on. | `{}` |
| $component.http.ingress.enabled | Set up ingress for the http service | false |
| $component.http.ingress.apiVersion | Set API version for ingress | extensions/v1beta1 |
| $component.http.ingress.defaultBackend | Set up default backend for ingress | false |
| $component.http.ingress.annotations | Add annotations to ingress | {} |
| $component.http.ingress.labels | Add labels to ingress | {} |
| $component.http.ingress.path | Ingress path | "/" |
| $component.http.ingress.hosts | Ingress hosts | [] |
| $component.http.ingress.tls | Ingress TLS configuration | [] |

## Store

These values are just samples, for more fine-tuning please check the values.yaml.

|Name|Description| Default Value|
|----|-----------|--------------|
| store.enabled | Enable component | true |
| store.replicaCount | Pod replica count | 1 |
| store.logLevel | Log level | info |
| store.logFormat | Log format to use. Possible options: logfmt or json. | logfmt |
| store.indexCacheSize | Maximum size of items held in the index cache. | 250MB |
| store.chunkPoolSize | Maximum size of concurrently allocatable bytes for chunks. | 2GB |
| store.grpcSeriesSampleLimit | Maximum amount of samples returned via a single series call. 0 means no limit. NOTE: for efficiency we take 120 as the number of samples in chunk (it cannot be bigger than that), so the actual number of samples might be lower, even though the maximum could be hit. | 0 |
| store.grpcSeriesMaxConcurrency | Maximum number of concurrent Series calls. | 20 |
| store.syncBlockDuration |Repeat interval for syncing the blocks between local and remote view. | 3m |
| store.blockSyncConcurrency | Number of goroutines to use when syncing blocks from object storage. | 20 |
| store.extraEnv | Add extra environment variables | [] |
| store.extraArgs | Add extra arguments | [] |
| store.serviceAccount | Name of the Kubernetes service account to use | "" |
| store.livenessProbe  | Set up liveness probe for store available for Thanos v0.8.0+) |  {} |
| store.readinessProbe  | Set up readinessProbe for store (available for Thanos v0.8.0+) | {}  |
| timePartioning   |  list of min/max time for store partitions. See more details below. Setting this will create mutlipale thanos store deployments based on the number of items in the list  | [{min: "", max: ""}] |
| hashPartioning.shards   | The number of shared used to partition the blocks based on the hashmod of the blocks. Can not be used with time partitioning | "" |
| initContainers   |  InitContainers allows injecting specialized containers that run before app containers. This is meant to pre-configure and tune mounted volume permissions.  | [] |


### Store time partions
Thanos store supports partition based on time.
Setting time partitions will create n number of store deployment based on the number of items in the list. Each item must contain min and max time for querying in the supported format (see details here See details at https://thanos.io/components/store.md/#time-based-partioning ).
Leaving this empty list ([]) will create a single store for all data.
Example - This will create 3 stores:
```yaml
timePartioning:
  # One store for data older than 6 weeks
  - min: ""
    max: -6w
  # One store for data newer than 6 weeks and older than 2 weeks
  - min: -6w
    max: -2w
  # One store for data newer than 2 weeks
  - min: -2w
    max: ""
```


## Query

|Name|Description| Default Value|
|----|-----------|--------------|
| query.enabled | Enable component | true |
| query.replicaCount | Pod replica count | 1 |
| query.logLevel | Log level | info |
| query.logFormat | Log format to use. Possible options: logfmt or json. | logfmt |
| query.replicaLabels | Labels to treat as a replica indicator along which data is deduplicated. Still you will be able to query without deduplication using 'dedup=false' parameter. | [] |
| query.autoDownsampling | Enable --query.auto-downsampling option for query. | true |
| query.webRoutePrefix |Prefix for API and UI endpoints. This allows thanos UI to be served on a sub-path. This option is analogous to --web.route-prefix of Promethus. | "" |
| query.webExternalPrefix |Static prefix for all HTML links and redirect URLs in the UI query web interface. Actual endpoints are still served on / or the web.route-prefix. This allows thanos UI to be served behind a reverse proxy that strips a URL sub-path | "" |
| query.webPrefixHeader | Name of HTTP request header used for dynamic prefixing of UI links and redirects. This option is ignored if web.external-prefix argument is set. Security risk: enable this option only if a reverse proxy in front of thanos is resetting the header. The --web.prefix-header=X-Forwarded-Prefix option can be useful, for example, if Thanos UI is served via Traefik reverse proxy with PathPrefixStrip option enabled, which sends the stripped prefix value in X-Forwarded-Prefix header. This allows thanos UI to be served on a sub-path | "" |
| query.storeDNSResolver | Custome DNS resolver because of [issue](https://github.com/improbable-eng/thanos/issues/1015) | miekgdns |
| query.storeDNSDiscovery | Enable DNS discovery for stores | true |
| query.sidecarDNSDiscovery | Enable DNS discovery for sidecars (this is for the chart built-in sidecar service) | true |
| query.stores | Addresses of statically configured store API servers (repeatable). The scheme may be prefixed with 'dns+' or 'dnssrv+' to detect store API servers through respective DNS lookups. | [] |
| query.serviceDiscoveryFiles | Path to files that contains addresses of store API servers. The path can be a glob pattern (repeatable). | [] |
| query.serviceDiscoveryFileConfigMaps | Names of configmaps that contain addresses of store API servers, used for file service discovery. | [] |
| query.serviceDiscoveryInterval | Refresh interval to re-read file SD files. It is used as a resync fallback. | 5m |
| query.extraEnv | Add extra environment variables | [] |
| query.extraArgs | Add extra arguments | [] |
| query.podDisruptionBudget.enabled | Enabled and config podDisruptionBudget resource for this component | false |
| query.podDisruptionBudget.minAvailable | Minimum number of available query pods for PodDisruptionBudget | 1 |
| query.podDisruptionBudget.maxUnavailable | Maximum number of unavailable query pods for PodDisruptionBudget | [] |
| query.autoscaling.enabled | Enabled and config horizontalPodAutoscaling resource for this component | false |
| query.autoscaling.minReplicas |	If autoscaling enabled, this field sets minimum replica count |	2 |
| query.autoscaling.maxReplicas |	If autoscaling enabled, this field sets maximum replica count |	3 |
| query.autoscaling.targetCPUUtilizationPercentage | 	Target CPU utilization percentage to scale | 50 |
| query.autoscaling.targetMemoryUtilizationPercentage |	Target memory utilization percentage to scale 50 |
| query.serviceAccount | Name of the Kubernetes service account to use | "" |
| query.serviceAccountAnnotations | Optional annotations to be added to the ServiceAccount | {} |
| query.psp.enabled | Enable pod security policy, it also requires the `query.rbac.enabled` to be set to `true`. | false |
| query.rbac.enabled | Enable RBAC to use the PSP | false |
| query.livenessProbe | Set up liveness probe for query | {} |
| query.readinessProbe | Set up readinessProbe for query | {} |

## Rule
|Name|Description| Default Value|
|----|-----------|--------------|
| rule.enabled | Enable component | false |
| rule.logLevel | Log level | info |
| rule.logFormat | Log format to use. Possible options: logfmt or json. | logfmt |
| rule.ruleLabels | Labels to be applied to all generated metrics (repeated). Similar to external labels for Prometheus, used to identify ruler and its blocks as unique source. | {} |
| rule.resendDelay | Minimum amount of time to wait before resending an alert to Alertmanager. | "" |
| rule.evalInterval | The default evaluation interval to use. | "" |
| rule.tsdbBlockDuration | Block duration for TSDB block. | "" |
| rule.tsdbRetention | Block retention time on local disk. | "" |
| rule.webRoutePrefix |Prefix for API and UI endpoints. This allows thanos UI to be served on a sub-path. This option is analogous to --web.route-prefix of Promethus. | "" |
| rule.webExternalPrefix |Static prefix for all HTML links and redirect URLs in the UI query web interface. Actual endpoints are still served on / or the web.route-prefix. This allows thanos UI to be served behind a reverse proxy that strips a URL sub-path | "" |
| rule.webPrefixHeader | Name of HTTP request header used for dynamic prefixing of UI links and redirects. This option is ignored if web.external-prefix argument is set. Security risk: enable this option only if a reverse proxy in front of thanos is resetting the header. The --web.prefix-header=X-Forwarded-Prefix option can be useful, for example, if Thanos UI is served via Traefik reverse proxy with PathPrefixStrip option enabled, which sends the stripped prefix value in X-Forwarded-Prefix header. This allows thanos UI to be served on a sub-path | "" |
| rule.queryDNSDiscovery | Enable DNS discovery for query insances | true |
| rule.alertmanagers |   # Alertmanager replica URLs to push firing alerts. Ruler claims success if push to at least one alertmanager from discovered succeeds. The scheme may be prefixed with 'dns+' or 'dnssrv+' to detect Alertmanager IPs  through respective DNS lookups. The port defaults to 9093 or the SRV record's value. The URL path is used as a prefix for the regular Alertmanager API path. | []] |
| rule.alertmanagersSendTimeout | Timeout for sending alerts to alertmanagert | "" |
| rule.alertQueryUrl |The external Thanos Query URL that would be set in all alerts 'Source' field | "" |
| rule.alertLabelDrop | Labels by name to drop before sending to alertmanager. This allows alert to be deduplicated on replica label (repeated). Similar Prometheus alert relabelling | [] |
| rule.ruleOverrideName | Override rules file with custom configmap | "" |
| rule.ruleFiles | See example in values.yaml | {}" |
| rule.persistentVolumeClaim    | Create the specified persistentVolumeClaim in case persistentVolumeClaim is used for the dataVolume.backend above and needs to be created. | {} |

## Compact

|Name|Description| Default Value|
|----|-----------|--------------|
| compact.enabled | Enable component | true |
| compact.replicaCount | Pod replica count | 1 |
| compact.logLevel | Log level | info |
| compact.logFormat | Log format to use. Possible options: logfmt or json. | logfmt |
| compact.serviceAccount | Name of the Kubernetes service account to use | "" |
| compact.consistencyDelay | Minimum age of fresh (non-compacted) blocks before they are being processed. Malformed blocks older than the maximum of consistency-delay and 30m0s will be removed.| 30m |
| compact.retentionResolutionRaw | How long to retain raw samples in bucket. 0d - disables this retention | 30d |
| compact.retentionResolution5m | How long to retain samples of resolution 1 (5 minutes) in bucket. 0d - disables this retention | 120d |
| compact.retentionResolution1h | How long to retain samples of resolution 2 (1 hour) in bucket. 0d - disables this retention | 1y |
| compact.blockSyncConcurrency | Number of goroutines to use when syncing block metadata from object storage. | 20 |
| compact.compactConcurrency | Number of goroutines to use when compacting groups. | 1 |
| compact.dataVolume.backend | Data volume for the compactor to store temporary data defaults to emptyDir. | {} |
| compact.persistentVolumeClaim | Create the specified persistentVolumeClaim in case persistentVolumeClaim is used for the dataVolume.backend above and needs to be created. | {} |

## Bucket

|Name|Description| Default Value|
|----|-----------|--------------|
| bucket.enabled | Enable component | true |
| bucket.replicaCount | Pod replica count | 1 |
| bucket.logLevel | Log level | info |
| bucket.logFormat | Log format to use. Possible options: logfmt or json. | logfmt |
| bucket.refresh | Refresh interval to download metadata from remote storage | 30m |
| bucket.timeout | Timeout to download metadata from remote storage | 5m |
| bucket.label | Prometheus label to use as timeline title | "" |
| bucket.http.port | Listening port for bucket web | 8080 |
| bucket.serviceAccount | Name of the Kubernetes service account to use | "" |
| bucket.podDisruptionBudget.enabled | Enabled and config podDisruptionBudget resource for this component | false |
| bucket.podDisruptionBudget.minAvailable | Minimum number of available query pods for PodDisruptionBudget | 1 |
| bucket.podDisruptionBudget.maxUnavailable | Maximum number of unavailable query pods for PodDisruptionBudget | [] |

## Sidecar

|Name|Description| Default Value|
|----|-----------|--------------|
| sidecar.enabled | NOTE: This is only the service references for the sidecar. | true |
| sidecar.selector | Pod label selector to match sidecar services on. | `{"app": "prometheus"}` |

## Query Frontend

|Name|Description| Default Value|
|----|-----------|--------------|
| queryFrontend.enabled | Enable component | false |
| queryFrontend.replicaCount | Pod replica count | 1 |
| queryFrontend.logLevel | Log level | info |
| queryFrontend.logFormat | Log format to use. Possible options: logfmt or json. | logfmt |
| queryFrontend.downstreamUrl | URL of downstream Prometheus Query compatible API. | |
| queryFrontend.compressResponses | Compress HTTP responses. | `true` |
| queryFrontend.logQueriesLongerThan | Log queries that are slower than the specified duration. | `0` (disabled) |
| queryFrontend.cacheCompressionType | Use compression in results cache. Supported values are: `snappy` and `` (disable compression). | `` |
| queryFrontend.queryRange.alignRangeWithStep | See https://thanos.io/tip/components/query-frontend.md/#flags | `false` |
| queryFrontend.queryRange.splitInterval | See https://thanos.io/tip/components/query-frontend.md/#flags  | `24h` |
| queryFrontend.queryRange.maxRetriesPerRequest | See https://thanos.io/tip/components/query-frontend.md/#flags  | `5` |
| queryFrontend.queryRange.maxQueryLength | See https://thanos.io/tip/components/query-frontend.md/#flags  | `0` |
| queryFrontend.queryRange.maxQueryParallelism | See https://thanos.io/tip/components/query-frontend.md/#flags  | `14` |
| queryFrontend.queryRange.responseCacheMaxFreshness | See https://thanos.io/tip/components/query-frontend.md/#flag | `1m` |
| queryFrontend.queryRange.noPartialResponse | See https://thanos.io/tip/components/query-frontend.md/#flags | `false` |
| queryFrontend.cache.inMemory | Use inMemory cache? | `false` |
| queryFrontend.cache.maxSize | Maximum Size of the cache. Use either this or `maxSizeItems`. | `` |
| queryFrontend.cache.maxSizeItems | Maximum number of items in the cache. Use either this or `maxSize`. | `` |
| queryFrontend.cache.validity | | `` |
| queryFrontend.log.request.decision | Request Logging for logging the start and end of requests | `LogFinishCall` |
| queryFrontend.serviceAccountAnnotations | Optional annotations to be added to the ServiceAccount | {} |

## Contributing
Contributions are very welcome!
