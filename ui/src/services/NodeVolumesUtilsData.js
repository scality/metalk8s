export const stateApp = {
  app: {
    nodes: {
      clusterVersion: '2.6.0-dev',
      list: [
        {
          name: 'bootstrap',

          status: 'ready',
          roles: '',
          deploying: false,
          internalIP: '192.168.1.18',
        },
        {
          name: 'master-0',

          status: 'ready',
          control_plane: true,
          workload_plane: false,
          bootstrap: false,
          infra: true,
          roles: 'Control Plane / Infra',
          deploying: false,
          internalIP: '192.168.1.36',
        },
        {
          name: 'master-1',
          metalk8s_version: '2.6.0-dev',
          status: 'unknown',
          roles: '',
          deploying: false,
          internalIP: '192.168.1.33',
        },
      ],
      isRefreshing: true,
      isLoading: false,
    },
    pods: {},
    volumes: {
      list: [
        {
          apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
          kind: 'Volume',
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/last-applied-configuration':
                '{"apiVersion":"storage.metalk8s.scality.com/v1alpha1","kind":"Volume","metadata":{"annotations":{},"labels":{"app.kubernetes.io/name":"prometheus-operator-alertmanager"},"name":"master-0-alertmanager"},"spec":{"nodeName":"master-0","sparseLoopDevice":{"size":"5Gi"},"storageClassName":"metalk8s","template":{"metadata":{"labels":{"app.kubernetes.io/name":"prometheus-operator-alertmanager"}}}}}\n',
            },
            creationTimestamp: '2020-08-06T15:16:37Z',
            finalizers: ['storage.metalk8s.scality.com/volume-protection'],
            generation: 4,
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
            },
            name: 'master-0-alertmanager',
            resourceVersion: '876564',
            selfLink:
              '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/master-0-alertmanager',
            uid: 'dadda9e7-dc1f-4632-8450-61eb3bdf0db3',
          },
          spec: {
            mode: 'Filesystem',
            nodeName: 'master-0',
            sparseLoopDevice: {
              size: '5Gi',
            },
            storageClassName: 'metalk8s',
            template: {
              metadata: {
                creationTimestamp: null,
                labels: {
                  'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
                },
              },
              spec: {},
            },
          },
          status: {
            conditions: [
              {
                lastTransitionTime: '2020-08-06T15:18:20Z',
                lastUpdateTime: '2020-08-06T15:18:20Z',
                status: 'True',
                type: 'Ready',
              },
            ],
            deviceName: 'loop0',
          },
        },
        {
          apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
          kind: 'Volume',
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/last-applied-configuration':
                '{"apiVersion":"storage.metalk8s.scality.com/v1alpha1","kind":"Volume","metadata":{"annotations":{},"labels":{"app.kubernetes.io/name":"prometheus-operator-alertmanager"},"name":"master-1-alertmanager"},"spec":{"nodeName":"master-1","sparseLoopDevice":{"size":"5Gi"},"storageClassName":"metalk8s","template":{"metadata":{"labels":{"app.kubernetes.io/name":"prometheus-operator-alertmanager"}}}}}\n',
            },
            creationTimestamp: '2020-08-06T15:16:38Z',
            finalizers: ['storage.metalk8s.scality.com/volume-protection'],
            generation: 4,
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
            },
            name: 'master-1-alertmanager',
            resourceVersion: '2639792',
            selfLink:
              '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/master-1-alertmanager',
            uid: '5d31d785-7364-49fd-93bd-86baedbca860',
          },
          spec: {
            mode: 'Filesystem',
            nodeName: 'master-1',
            sparseLoopDevice: {
              size: '5Gi',
            },
            storageClassName: 'metalk8s',
            template: {
              metadata: {
                creationTimestamp: null,
                labels: {
                  'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
                },
              },
              spec: {},
            },
          },
          status: {
            conditions: [
              {
                lastTransitionTime: '2020-08-06T15:23:11Z',
                lastUpdateTime: '2020-08-06T15:23:11Z',
                status: 'True',
                type: 'Ready',
              },
            ],
            deviceName: 'loop0',
          },
        },
        {
          apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
          kind: 'Volume',
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/last-applied-configuration':
                '{"apiVersion":"storage.metalk8s.scality.com/v1alpha1","kind":"Volume","metadata":{"annotations":{},"labels":{"app.kubernetes.io/name":"prometheus-operator-prometheus"},"name":"master-1-prometheus"},"spec":{"nodeName":"master-1","sparseLoopDevice":{"size":"20Gi"},"storageClassName":"metalk8s","template":{"metadata":{"labels":{"app.kubernetes.io/name":"prometheus-operator-prometheus"}}}}}\n',
            },
            creationTimestamp: '2020-08-06T15:16:38Z',
            finalizers: ['storage.metalk8s.scality.com/volume-protection'],
            generation: 4,
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-prometheus',
            },
            name: 'master-1-prometheus',
            resourceVersion: '2639557',
            selfLink:
              '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/master-1-prometheus',
            uid: '183dd142-9c46-411f-b160-d99bbd03f6c9',
          },
          spec: {
            mode: 'Filesystem',
            nodeName: 'master-1',
            sparseLoopDevice: {
              size: '20Gi',
            },
            storageClassName: 'metalk8s',
            template: {
              metadata: {
                creationTimestamp: null,
                labels: {
                  'app.kubernetes.io/name': 'prometheus-operator-prometheus',
                },
              },
              spec: {},
            },
          },
          status: {
            conditions: [
              {
                lastTransitionTime: '2020-08-06T15:17:58Z',
                lastUpdateTime: '2020-08-06T15:17:58Z',
                status: 'True',
                type: 'Ready',
              },
            ],
            deviceName: 'loop1',
          },
        },
        {
          apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
          kind: 'Volume',
          metadata: {
            creationTimestamp: '2020-08-12T07:56:38Z',
            finalizers: ['storage.metalk8s.scality.com/volume-protection'],
            generation: 2,
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-prometheus',
            },
            name: 'prom-m0-reldev',
            resourceVersion: '1454956',
            selfLink:
              '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/prom-m0-reldev',
            uid: 'bfd1709b-b4ce-4e53-8cea-8fbe236b31e5',
          },
          spec: {
            mode: 'Filesystem',
            nodeName: 'master-0',
            rawBlockDevice: {
              devicePath: '/dev/vdd',
            },
            storageClassName: 'metalk8s',
            template: {
              metadata: {
                creationTimestamp: null,
                labels: {
                  'app.kubernetes.io/name': 'prometheus-operator-prometheus',
                },
              },
              spec: {},
            },
          },
          status: {
            conditions: [
              {
                lastTransitionTime: '2020-08-12T07:57:13Z',
                lastUpdateTime: '2020-08-12T07:57:13Z',
                status: 'True',
                type: 'Ready',
              },
            ],
            deviceName: 'vdd',
          },
        },
      ],
      storageClass: [],
      pVList: [
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:18:19.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
            },
            name: 'master-0-alertmanager',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'master-0-alertmanager',
                uid: 'dadda9e7-dc1f-4632-8450-61eb3bdf0db3',
              },
            ],
            resourceVersion: '6123',
            selfLink: '/api/v1/persistentvolumes/master-0-alertmanager',
            uid: 'fb9ee37d-7f56-4598-82ce-df35b5bf536a',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '5Gi',
            },
            claimRef: {
              apiVersion: 'v1',
              kind: 'PersistentVolumeClaim',
              name:
                'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-0',
              namespace: 'metalk8s-monitoring',
              resourceVersion: '1100',
              uid: 'dad7079f-c565-47cd-b7f9-adac7d22139c',
            },
            local: {
              fsType: 'ext4',
              path: '/dev/disk/by-uuid/dadda9e7-dc1f-4632-8450-61eb3bdf0db3',
            },
            mountOptions: ['rw', 'discard'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['master-0'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
          },
          status: {
            phase: 'Bound',
          },
        },
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:23:11.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
            },
            name: 'master-1-alertmanager',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'master-1-alertmanager',
                uid: '5d31d785-7364-49fd-93bd-86baedbca860',
              },
            ],
            resourceVersion: '7225',
            selfLink: '/api/v1/persistentvolumes/master-1-alertmanager',
            uid: '47f87e8c-2376-4aa9-afd8-e69f37974575',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '5Gi',
            },
            claimRef: {
              apiVersion: 'v1',
              kind: 'PersistentVolumeClaim',
              name:
                'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-1',
              namespace: 'metalk8s-monitoring',
              resourceVersion: '1659',
              uid: 'dfb10f4a-b200-4561-b000-1c15918de452',
            },
            local: {
              fsType: 'ext4',
              path: '/dev/disk/by-uuid/5d31d785-7364-49fd-93bd-86baedbca860',
            },
            mountOptions: ['rw', 'discard'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['master-1'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
          },
          status: {
            phase: 'Bound',
          },
        },
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:17:58.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-prometheus',
            },
            name: 'master-1-prometheus',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'master-1-prometheus',
                uid: '183dd142-9c46-411f-b160-d99bbd03f6c9',
              },
            ],
            resourceVersion: '5982',
            selfLink: '/api/v1/persistentvolumes/master-1-prometheus',
            uid: '6134dfb5-84f5-4fe1-9f09-f19bbc41e0ac',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '20Gi',
            },
            claimRef: {
              apiVersion: 'v1',
              kind: 'PersistentVolumeClaim',
              name:
                'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-0',
              namespace: 'metalk8s-monitoring',
              resourceVersion: '1193',
              uid: '2e2db599-5f27-4c0d-b490-a5dd48cc711c',
            },
            local: {
              fsType: 'ext4',
              path: '/dev/disk/by-uuid/183dd142-9c46-411f-b160-d99bbd03f6c9',
            },
            mountOptions: ['rw', 'discard'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['master-1'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
          },
          status: {
            phase: 'Bound',
          },
        },
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-12T07:57:11.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              'app.kubernetes.io/name': 'prometheus-operator-prometheus',
            },
            name: 'prom-m0-reldev',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'prom-m0-reldev',
                uid: 'bfd1709b-b4ce-4e53-8cea-8fbe236b31e5',
              },
            ],
            resourceVersion: '1483668',
            selfLink: '/api/v1/persistentvolumes/prom-m0-reldev',
            uid: '383ffdf1-c2b4-4c46-990c-54af854cf199',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '20Gi',
            },
            claimRef: {
              apiVersion: 'v1',
              kind: 'PersistentVolumeClaim',
              name:
                'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-1',
              namespace: 'metalk8s-monitoring',
              resourceVersion: '1483663',
              uid: '0c00f9a7-968d-4d8c-b519-78dd5fa4d32f',
            },
            local: {
              fsType: 'ext4',
              path: '/dev/disk/by-uuid/bfd1709b-b4ce-4e53-8cea-8fbe236b31e5',
            },
            mountOptions: ['rw', 'discard'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['master-0'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
          },
          status: {
            phase: 'Bound',
          },
        },
      ],
      isRefreshing: true,
      pVCList: [
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bind-completed': 'yes',
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:00:25.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              alertmanager: 'prometheus-operator-alertmanager',
              app: 'alertmanager',
            },
            name:
              'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-0',
            namespace: 'metalk8s-monitoring',
            resourceVersion: '6125',
            selfLink:
              '/api/v1/namespaces/metalk8s-monitoring/persistentvolumeclaims/alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-0',
            uid: 'dad7079f-c565-47cd-b7f9-adac7d22139c',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '1Gi',
              },
            },
            selector: {
              matchLabels: {
                'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
              },
            },
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
            volumeName: 'master-0-alertmanager',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '5Gi',
            },
            phase: 'Bound',
          },
        },
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bind-completed': 'yes',
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:01:05.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              alertmanager: 'prometheus-operator-alertmanager',
              app: 'alertmanager',
            },
            name:
              'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-1',
            namespace: 'metalk8s-monitoring',
            resourceVersion: '7227',
            selfLink:
              '/api/v1/namespaces/metalk8s-monitoring/persistentvolumeclaims/alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-1',
            uid: 'dfb10f4a-b200-4561-b000-1c15918de452',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '1Gi',
              },
            },
            selector: {
              matchLabels: {
                'app.kubernetes.io/name': 'prometheus-operator-alertmanager',
              },
            },
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
            volumeName: 'master-1-alertmanager',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '5Gi',
            },
            phase: 'Bound',
          },
        },
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bind-completed': 'yes',
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:00:36.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'prometheus',
              prometheus: 'prometheus-operator-prometheus',
            },
            name:
              'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-0',
            namespace: 'metalk8s-monitoring',
            resourceVersion: '5985',
            selfLink:
              '/api/v1/namespaces/metalk8s-monitoring/persistentvolumeclaims/prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-0',
            uid: '2e2db599-5f27-4c0d-b490-a5dd48cc711c',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '10Gi',
              },
            },
            selector: {
              matchLabels: {
                'app.kubernetes.io/name': 'prometheus-operator-prometheus',
              },
            },
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
            volumeName: 'master-1-prometheus',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '20Gi',
            },
            phase: 'Bound',
          },
        },
        {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/last-applied-configuration':
                '{"apiVersion":"v1","kind":"PersistentVolumeClaim","metadata":{"annotations":{},"labels":{"app":"prometheus","prometheus":"prometheus-operator-prometheus"},"name":"prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-1","namespace":"metalk8s-monitoring"},"spec":{"accessModes":["ReadWriteOnce"],"resources":{"requests":{"storage":"10Gi"}},"selector":{"matchLabels":{"app.kubernetes.io/name":"prometheus-operator-prometheus"}},"storageClassName":"metalk8s"}}\n',
              'pv.kubernetes.io/bind-completed': 'yes',
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-12T09:59:16.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'prometheus',
              prometheus: 'prometheus-operator-prometheus',
            },
            name:
              'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-1',
            namespace: 'metalk8s-monitoring',
            resourceVersion: '1483670',
            selfLink:
              '/api/v1/namespaces/metalk8s-monitoring/persistentvolumeclaims/prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-1',
            uid: '0c00f9a7-968d-4d8c-b519-78dd5fa4d32f',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '10Gi',
              },
            },
            selector: {
              matchLabels: {
                'app.kubernetes.io/name': 'prometheus-operator-prometheus',
              },
            },
            storageClassName: 'metalk8s',
            volumeMode: 'Filesystem',
            volumeName: 'prom-m0-reldev',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '20Gi',
            },
            phase: 'Bound',
          },
        },
      ],
      isPVRefreshing: true,
      isLoading: false,
      isSCLoading: false,
    },
    monitoring: {
      alert: {
        list: [],
        error: null,
        isLoading: false,
        isRefreshing: true,
      },
      cluster: {
        apiServerStatus: 0,
        kubeSchedulerStatus: 0,
        kubeControllerManagerStatus: 0,
        error: null,
        isLoading: false,
        isRefreshing: false,
        isPrometheusVolumeProvisioned: true,
      },
      isPrometheusApiUp: true,
      volumeCurrentStats: {
        metrics: {
          volumeUsedCurrent: [
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.36:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-0',
                persistentvolumeclaim:
                  'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '6329057280'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.36:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-0',
                persistentvolumeclaim:
                  'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '20967424'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.33:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-1',
                persistentvolumeclaim:
                  'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '20967424'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.33:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-1',
                persistentvolumeclaim:
                  'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '7685541888'],
            },
          ],
          volumeCapacityCurrent: [
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.36:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-0',
                persistentvolumeclaim:
                  'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '21003583488'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.36:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-0',
                persistentvolumeclaim:
                  'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '5150212096'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.33:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-1',
                persistentvolumeclaim:
                  'alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '5150212096'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.33:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'metalk8s-monitoring',
                node: 'master-1',
                persistentvolumeclaim:
                  'prometheus-prometheus-operator-prometheus-db-prometheus-prometheus-operator-prometheus-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '21003583488'],
            },
          ],
          volumeLatencyCurrent: [
            {
              metric: {
                device: 'vda',
                endpoint: 'metrics',
                instance: '192.168.1.33:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-zstkq',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.004552973060035439'],
            },
            {
              metric: {
                device: 'vdb',
                endpoint: 'metrics',
                instance: '192.168.1.33:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-zstkq',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.12141821721440599'],
            },
            {
              metric: {
                device: 'vdc',
                endpoint: 'metrics',
                instance: '192.168.1.33:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-zstkq',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.010689710712259834'],
            },
            {
              metric: {
                device: 'vdd',
                endpoint: 'metrics',
                instance: '192.168.1.33:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-zstkq',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0'],
            },
            {
              metric: {
                device: 'vda',
                endpoint: 'metrics',
                instance: '192.168.1.29:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-9p42x',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.08204396263092173'],
            },
            {
              metric: {
                device: 'vdb',
                endpoint: 'metrics',
                instance: '192.168.1.29:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-9p42x',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.05098542952885812'],
            },
            {
              metric: {
                device: 'vda',
                endpoint: 'metrics',
                instance: '192.168.1.6:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-8nnmv',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.002872818670408203'],
            },
            {
              metric: {
                device: 'vdb',
                endpoint: 'metrics',
                instance: '192.168.1.6:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-8nnmv',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.04146847644532387'],
            },
            {
              metric: {
                device: 'vda',
                endpoint: 'metrics',
                instance: '192.168.1.9:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-bzd7m',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.0029543392540566484'],
            },
            {
              metric: {
                device: 'vdb',
                endpoint: 'metrics',
                instance: '192.168.1.9:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-bzd7m',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.03376971952124411'],
            },
            {
              metric: {
                device: 'vda',
                endpoint: 'metrics',
                instance: '192.168.1.18:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-w4rlb',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.0031929480078038016'],
            },
            {
              metric: {
                device: 'vdb',
                endpoint: 'metrics',
                instance: '192.168.1.18:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-w4rlb',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0'],
            },
            {
              metric: {
                device: 'vdc',
                endpoint: 'metrics',
                instance: '192.168.1.18:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-w4rlb',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.015460266018310631'],
            },
            {
              metric: {
                device: 'vda',
                endpoint: 'metrics',
                instance: '192.168.1.36:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-mgvjj',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.002717631833995327'],
            },
            {
              metric: {
                device: 'vdb',
                endpoint: 'metrics',
                instance: '192.168.1.36:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-mgvjj',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.1181903742836172'],
            },
            {
              metric: {
                device: 'vdc',
                endpoint: 'metrics',
                instance: '192.168.1.36:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-mgvjj',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.00020952263572753224'],
            },
            {
              metric: {
                device: 'vdd',
                endpoint: 'metrics',
                instance: '192.168.1.36:9100',
                job: 'node-exporter',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-mgvjj',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1597932620.982, '0.004541991361392974'],
            },
          ],
        },
        isRefreshing: true,
      },
    },
  },
};
