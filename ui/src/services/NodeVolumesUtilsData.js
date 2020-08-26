export const state_volume_filtered_by_node_master0 = {
  app: {
    nodes: {
      clusterVersion: '2.6.0-dev',
      list: [
        {
          name: 'bootstrap',
          metalk8s_version: '2.6.0-dev',
          status: 'ready',
          roles: '',
          deploying: false,
          internalIP: '192.168.1.18',
        },
        {
          name: 'master-0',
          metalk8s_version: '2.6.0-dev',
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
        {
          metadata: {
            creationTimestamp: '2020-08-06T15:37:06.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              app: 'burry',
            },
            name: 'worker-0-burry-1',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'worker-0-burry-1',
                uid: '38747a66-1515-4325-9c88-ecada20c65f3',
              },
            ],
            resourceVersion: '12131',
            selfLink: '/api/v1/persistentvolumes/worker-0-burry-1',
            uid: 'f3ed0e8c-0e16-4cf5-9c69-76ab08518c2d',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '1Gi',
            },
            local: {
              fsType: 'ext4',
              path: '/dev/disk/by-uuid/38747a66-1515-4325-9c88-ecada20c65f3',
            },
            mountOptions: ['rw'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['worker-0'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
          },
          status: {
            phase: 'Available',
          },
        },
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:40:00.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              app: 'mgob',
            },
            name: 'worker-0-mgob-1',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'worker-0-mgob-1',
                uid: '6e7a43c2-9cf6-4404-99e0-22c78faf41b6',
              },
            ],
            resourceVersion: '13738',
            selfLink: '/api/v1/persistentvolumes/worker-0-mgob-1',
            uid: 'b3ed4209-9339-473d-bafd-9ce414d3564a',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '10Gi',
            },
            claimRef: {
              apiVersion: 'v1',
              kind: 'PersistentVolumeClaim',
              name: 'mgob-storage-zenko-mgob-0',
              namespace: 'zenko',
              resourceVersion: '13451',
              uid: 'f8ce047b-c2fc-4c95-90d8-9cb0dc555356',
            },
            local: {
              fsType: 'ext4',
              path: '/dev/disk/by-uuid/6e7a43c2-9cf6-4404-99e0-22c78faf41b6',
            },
            mountOptions: ['rw'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['worker-0'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'zenko',
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
            creationTimestamp: '2020-08-06T15:39:40.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              app: 'mongodb-replicaset',
            },
            name: 'worker-0-mongodb-replicaset-1',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'worker-0-mongodb-replicaset-1',
                uid: '71d650d1-b260-43d0-bd48-ed27021687e7',
              },
            ],
            resourceVersion: '16523',
            selfLink: '/api/v1/persistentvolumes/worker-0-mongodb-replicaset-1',
            uid: '4818a72b-ff73-46d4-81d7-7644d248297f',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '50Gi',
            },
            claimRef: {
              apiVersion: 'v1',
              kind: 'PersistentVolumeClaim',
              name: 'datadir-zenko-mongodb-replicaset-1',
              namespace: 'zenko',
              resourceVersion: '16511',
              uid: 'cd2f1f62-9601-425e-b723-d828d50c4dc4',
            },
            local: {
              fsType: 'xfs',
              path: '/dev/disk/by-uuid/71d650d1-b260-43d0-bd48-ed27021687e7',
            },
            mountOptions: ['rw'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['worker-0'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'zenko-xfs',
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
            creationTimestamp: '2020-08-06T15:39:02.000Z',
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection',
            ],
            labels: {
              app: 'prometheus-server',
            },
            name: 'worker-0-prometheus-server-1',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                blockOwnerDeletion: true,
                controller: true,
                kind: 'Volume',
                name: 'worker-0-prometheus-server-1',
                uid: '9d022008-0448-46ae-8921-69769ceadae4',
              },
            ],
            resourceVersion: '13613',
            selfLink: '/api/v1/persistentvolumes/worker-0-prometheus-server-1',
            uid: '27bd2f32-4177-433e-92cc-33e09400d3de',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '10Gi',
            },
            claimRef: {
              apiVersion: 'v1',
              kind: 'PersistentVolumeClaim',
              name: 'storage-volume-zenko-prometheus-server-0',
              namespace: 'zenko',
              resourceVersion: '13444',
              uid: 'c8657f34-5135-48b5-82f8-6d8b8320dbcc',
            },
            local: {
              fsType: 'ext4',
              path: '/dev/disk/by-uuid/9d022008-0448-46ae-8921-69769ceadae4',
            },
            mountOptions: ['rw'],
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['worker-0'],
                      },
                    ],
                  },
                ],
              },
            },
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'zenko',
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
        {
          metadata: {
            annotations: {
              'pv.kubernetes.io/bind-completed': 'yes',
              'pv.kubernetes.io/bound-by-controller': 'yes',
            },
            creationTimestamp: '2020-08-06T15:40:37.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'redis-ha',
              release: 'zenko',
            },
            name: 'data-zenko-redis-ha-server-0',
            namespace: 'zenko',
            resourceVersion: '13794',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/data-zenko-redis-ha-server-0',
            uid: '00d90ef1-b70d-4cf5-a386-ba3c57d9b1c3',
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
                app: 'redis-ha',
              },
            },
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
            volumeName: 'worker-2-redis-ha-3',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '10Gi',
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
            creationTimestamp: '2020-08-06T15:43:14.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'redis-ha',
              release: 'zenko',
            },
            name: 'data-zenko-redis-ha-server-1',
            namespace: 'zenko',
            resourceVersion: '15424',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/data-zenko-redis-ha-server-1',
            uid: '6ee15f24-56f0-4ce8-a753-3c093cecf3cf',
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
                app: 'redis-ha',
              },
            },
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
            volumeName: 'worker-1-redis-ha-2',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '10Gi',
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
            creationTimestamp: '2020-08-06T15:44:56.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'redis-ha',
              release: 'zenko',
            },
            name: 'data-zenko-redis-ha-server-2',
            namespace: 'zenko',
            resourceVersion: '16570',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/data-zenko-redis-ha-server-2',
            uid: 'fb53f9c0-8797-48d1-91f2-ff5d59afd7ca',
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
                app: 'redis-ha',
              },
            },
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
            volumeName: 'worker-0-redis-ha-1',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '10Gi',
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
            creationTimestamp: '2020-08-06T15:40:36.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'zenko-quorum',
              component: 'server',
              release: 'zenko',
            },
            name: 'data-zenko-zenko-quorum-0',
            namespace: 'zenko',
            resourceVersion: '13587',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/data-zenko-zenko-quorum-0',
            uid: '8dc920ac-3630-4fc8-8f65-bddcca4e2495',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '5Gi',
              },
            },
            selector: {
              matchLabels: {
                app: 'zenko-quorum',
              },
            },
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
            volumeName: 'worker-1-zenko-quorum-2',
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
            creationTimestamp: '2020-08-06T15:45:47.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'zenko-quorum',
              component: 'server',
              release: 'zenko',
            },
            name: 'data-zenko-zenko-quorum-1',
            namespace: 'zenko',
            resourceVersion: '17021',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/data-zenko-zenko-quorum-1',
            uid: '20514068-d1ac-4add-8c7e-43614ab3e7ca',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '5Gi',
              },
            },
            selector: {
              matchLabels: {
                app: 'zenko-quorum',
              },
            },
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
            volumeName: 'worker-2-zenko-quorum-3',
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
            creationTimestamp: '2020-08-06T15:47:11.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'zenko-quorum',
              component: 'server',
              release: 'zenko',
            },
            name: 'data-zenko-zenko-quorum-2',
            namespace: 'zenko',
            resourceVersion: '17637',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/data-zenko-zenko-quorum-2',
            uid: '660f238c-bc5c-452b-87f0-4079df87f770',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '5Gi',
              },
            },
            selector: {
              matchLabels: {
                app: 'zenko-quorum',
              },
            },
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
            volumeName: 'worker-0-zenko-quorum-1',
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
            creationTimestamp: '2020-08-06T15:40:36.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'mongodb-replicaset',
              release: 'zenko',
            },
            name: 'datadir-zenko-mongodb-replicaset-0',
            namespace: 'zenko',
            resourceVersion: '13717',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/datadir-zenko-mongodb-replicaset-0',
            uid: 'ad4c1cca-d57e-4ffd-8e81-4cc3385c61ef',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '50Gi',
              },
            },
            selector: {
              matchLabels: {
                app: 'mongodb-replicaset',
              },
            },
            storageClassName: 'zenko-xfs',
            volumeMode: 'Filesystem',
            volumeName: 'worker-2-mongodb-replicaset-3',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '50Gi',
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
            creationTimestamp: '2020-08-06T15:44:53.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'mongodb-replicaset',
              release: 'zenko',
            },
            name: 'datadir-zenko-mongodb-replicaset-1',
            namespace: 'zenko',
            resourceVersion: '16528',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/datadir-zenko-mongodb-replicaset-1',
            uid: 'cd2f1f62-9601-425e-b723-d828d50c4dc4',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '50Gi',
              },
            },
            selector: {
              matchLabels: {
                app: 'mongodb-replicaset',
              },
            },
            storageClassName: 'zenko-xfs',
            volumeMode: 'Filesystem',
            volumeName: 'worker-0-mongodb-replicaset-1',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '50Gi',
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
            creationTimestamp: '2020-08-06T15:46:30.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'mongodb-replicaset',
              release: 'zenko',
            },
            name: 'datadir-zenko-mongodb-replicaset-2',
            namespace: 'zenko',
            resourceVersion: '17330',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/datadir-zenko-mongodb-replicaset-2',
            uid: '489dc4cb-ed79-4f68-9b66-cf1c82312e1d',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '50Gi',
              },
            },
            selector: {
              matchLabels: {
                app: 'mongodb-replicaset',
              },
            },
            storageClassName: 'zenko-xfs',
            volumeMode: 'Filesystem',
            volumeName: 'worker-1-mongodb-replicaset-2',
          },
          status: {
            accessModes: ['ReadWriteOnce'],
            capacity: {
              storage: '50Gi',
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
            creationTimestamp: '2020-08-06T15:40:36.000Z',
            finalizers: ['kubernetes.io/pvc-protection'],
            labels: {
              app: 'zenko-queue',
              release: 'zenko',
            },
            name: 'datadir-zenko-zenko-queue-0',
            namespace: 'zenko',
            resourceVersion: '13775',
            selfLink:
              '/api/v1/namespaces/zenko/persistentvolumeclaims/datadir-zenko-zenko-queue-0',
            uid: '9d53b70a-69e1-4132-9bea-141655e6ef98',
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '20Gi',
              },
            },
            selector: {
              matchLabels: {
                app: 'zenko-queue',
              },
            },
            storageClassName: 'zenko',
            volumeMode: 'Filesystem',
            volumeName: 'worker-1-zenko-queue-2',
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
        list: [
          {
            labels: {
              alertname: 'TargetDown',
              job: 'kube-state-metrics',
              namespace: 'metalk8s-monitoring',
              service: 'prometheus-operator-kube-state-metrics',
              severity: 'warning',
            },
            annotations: {
              message:
                '100% of the kube-state-metrics/prometheus-operator-kube-state-metrics targets in metalk8s-monitoring namespace are down.',
            },
            state: 'firing',
            activeAt: '2020-08-19T18:07:55.520605063Z',
            value: '1e+02',
          },
          {
            labels: {
              alertname: 'TargetDown',
              job: 'prometheus-operator-grafana',
              namespace: 'metalk8s-monitoring',
              service: 'prometheus-operator-grafana',
              severity: 'warning',
            },
            annotations: {
              message:
                '100% of the prometheus-operator-grafana/prometheus-operator-grafana targets in metalk8s-monitoring namespace are down.',
            },
            state: 'firing',
            activeAt: '2020-08-19T18:07:55.520605063Z',
            value: '1e+02',
          },
          {
            labels: {
              alertname: 'TargetDown',
              job: 'kubelet',
              namespace: 'kube-system',
              service: 'prometheus-operator-kubelet',
              severity: 'warning',
            },
            annotations: {
              message:
                '66.67% of the kubelet/prometheus-operator-kubelet targets in kube-system namespace are down.',
            },
            state: 'firing',
            activeAt: '2020-08-18T19:17:55.520605063Z',
            value: '6.666666666666666e+01',
          },
          {
            labels: {
              alertname: 'TargetDown',
              job: 'node-exporter',
              namespace: 'metalk8s-monitoring',
              service: 'prometheus-operator-prometheus-node-exporter',
              severity: 'warning',
            },
            annotations: {
              message:
                '33.33% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.',
            },
            state: 'firing',
            activeAt: '2020-08-20T04:03:25.520605063Z',
            value: '3.333333333333333e+01',
          },
          {
            labels: {
              alertname: 'TargetDown',
              job: 'kube-proxy',
              namespace: 'kube-system',
              service: 'prometheus-operator-kube-proxy',
              severity: 'warning',
            },
            annotations: {
              message:
                '50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.',
            },
            state: 'firing',
            activeAt: '2020-08-19T22:14:25.520605063Z',
            value: '5e+01',
          },
          {
            labels: {
              alertname: 'Watchdog',
              severity: 'none',
            },
            annotations: {
              message:
                'This is an alert meant to ensure that the entire alerting pipeline is functional.\nThis alert is always firing, therefore it should always be firing in Alertmanager\nand always fire against a receiver. There are integrations with various notification\nmechanisms that send a notification when this alert is not firing. For example the\n"DeadMansSnitch" integration in PagerDuty.',
            },
            state: 'firing',
            activeAt: '2020-08-17T07:58:55.520605063Z',
            value: '1e+00',
          },
          {
            labels: {
              alertname: 'NodeClockNotSynchronising',
              endpoint: 'metrics',
              instance: '192.168.1.36:9100',
              job: 'node-exporter',
              namespace: 'metalk8s-monitoring',
              pod: 'prometheus-operator-prometheus-node-exporter-fgrl9',
              service: 'prometheus-operator-prometheus-node-exporter',
              severity: 'warning',
            },
            annotations: {
              message:
                'Clock on 192.168.1.36:9100 is not synchronising. Ensure NTP is configured on this host.',
              runbook_url:
                'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeclocknotsynchronising',
              summary: 'Clock not synchronising.',
            },
            state: 'firing',
            activeAt: '2020-08-17T07:59:05.358542542Z',
            value: '0e+00',
          },
          {
            labels: {
              alertname: 'NodeClockNotSynchronising',
              endpoint: 'metrics',
              instance: '192.168.1.18:9100',
              job: 'node-exporter',
              namespace: 'metalk8s-monitoring',
              pod: 'prometheus-operator-prometheus-node-exporter-2dsdh',
              service: 'prometheus-operator-prometheus-node-exporter',
              severity: 'warning',
            },
            annotations: {
              message:
                'Clock on 192.168.1.18:9100 is not synchronising. Ensure NTP is configured on this host.',
              runbook_url:
                'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodeclocknotsynchronising',
              summary: 'Clock not synchronising.',
            },
            state: 'firing',
            activeAt: '2020-08-17T07:59:35.358542542Z',
            value: '0e+00',
          },
          {
            labels: {
              alertname: 'AlertmanagerConfigInconsistent',
              config_hash: '188962671705406',
              service: 'prometheus-operator-alertmanager',
              severity: 'critical',
            },
            annotations: {
              message:
                'The configuration of the instances of the Alertmanager cluster `prometheus-operator-alertmanager` are out of sync.',
            },
            state: 'firing',
            activeAt: '2020-08-19T18:08:30.310583042Z',
            value: '5e-01',
          },
          {
            labels: {
              alertname: 'AlertmanagerMembersInconsistent',
              endpoint: 'web',
              instance: '10.233.36.94:9093',
              job: 'prometheus-operator-alertmanager',
              namespace: 'metalk8s-monitoring',
              pod: 'alertmanager-prometheus-operator-alertmanager-0',
              service: 'prometheus-operator-alertmanager',
              severity: 'critical',
            },
            annotations: {
              message:
                'Alertmanager has not found all other members of the cluster.',
            },
            state: 'firing',
            activeAt: '2020-08-19T18:08:30.310583042Z',
            value: '2e+00',
          },
          {
            labels: {
              alertname: 'KubeAPIErrorBudgetBurn',
              severity: 'warning',
            },
            annotations: {
              message: 'The API server is burning too much error budget',
              runbook_url:
                'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapierrorbudgetburn',
            },
            state: 'firing',
            activeAt: '2020-08-17T15:16:32.74606594Z',
            value: '6.022196236808707e-02',
          },
          {
            labels: {
              alertname: 'KubeAPILatencyHigh',
              component: 'apiserver',
              endpoint: 'https',
              job: 'apiserver',
              namespace: 'default',
              resource: 'services',
              scope: 'namespace',
              service: 'kubernetes',
              severity: 'warning',
              verb: 'PUT',
              version: 'v1',
            },
            annotations: {
              message:
                'The API server has an abnormal latency of 0.4590810156666596 seconds for PUT services.',
              runbook_url:
                'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeapilatencyhigh',
            },
            state: 'pending',
            activeAt: '2020-08-20T08:50:52.14654001Z',
            value: '4.590810156666596e-01',
          },
          {
            labels: {
              alertname: 'AggregatedAPIDown',
              name: 'v1beta1.custom.metrics.k8s.io',
              namespace: 'default',
              severity: 'warning',
            },
            annotations: {
              message:
                'An aggregated API v1beta1.custom.metrics.k8s.io/default is down. It has not been available at least for the past five minutes.',
              runbook_url:
                'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-aggregatedapidown',
            },
            state: 'firing',
            activeAt: '2020-08-19T16:13:22.14654001Z',
            value: '1e+01',
          },
          {
            labels: {
              alertname: 'AggregatedAPIDown',
              name: 'v1beta1.metrics.k8s.io',
              namespace: 'default',
              severity: 'warning',
            },
            annotations: {
              message:
                'An aggregated API v1beta1.metrics.k8s.io/default is down. It has not been available at least for the past five minutes.',
              runbook_url:
                'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-aggregatedapidown',
            },
            state: 'firing',
            activeAt: '2020-08-19T07:11:52.14654001Z',
            value: '2e+01',
          },
          {
            labels: {
              alertname: 'PrometheusMissingRuleEvaluations',
              endpoint: 'web',
              instance: '10.233.36.95:9090',
              job: 'prometheus-operator-prometheus',
              namespace: 'metalk8s-monitoring',
              pod: 'prometheus-prometheus-operator-prometheus-1',
              service: 'prometheus-operator-prometheus',
              severity: 'warning',
            },
            annotations: {
              description:
                'Prometheus metalk8s-monitoring/prometheus-prometheus-operator-prometheus-1 has missed 3 rule group evaluations in the last 5m.',
              summary:
                'Prometheus is missing rule evaluations due to slow rule group evaluation.',
            },
            state: 'firing',
            activeAt: '2020-08-20T07:41:24.859562607Z',
            value: '3.333432101691902e+00',
          },
          {
            labels: {
              alertname: 'etcdHighNumberOfFailedGRPCRequests',
              grpc_method: 'Watch',
              grpc_service: 'etcdserverpb.Watch',
              instance: '192.168.1.36:2381',
              job: 'kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": 100% of requests for Watch failed on etcd instance 192.168.1.36:2381.',
            },
            state: 'pending',
            activeAt: '2020-08-20T08:46:45.279979961Z',
            value: '1e+02',
          },
          {
            labels: {
              alertname: 'etcdHighNumberOfFailedGRPCRequests',
              grpc_method: 'Watch',
              grpc_service: 'etcdserverpb.Watch',
              instance: '192.168.1.36:2381',
              job: 'kube-etcd',
              severity: 'critical',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": 100% of requests for Watch failed on etcd instance 192.168.1.36:2381.',
            },
            state: 'pending',
            activeAt: '2020-08-20T08:46:45.279979961Z',
            value: '1e+02',
          },
          {
            labels: {
              To: 'e52b00657d7506bf',
              alertname: 'etcdMemberCommunicationSlow',
              endpoint: 'http-metrics',
              instance: '192.168.1.36:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-master-0',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": member communication with e52b00657d7506bf is taking 0.400384s on etcd instance 192.168.1.36:2381.',
            },
            state: 'firing',
            activeAt: '2020-08-17T12:42:15.279979961Z',
            value: '4.00384e-01',
          },
          {
            labels: {
              To: 'a760cbd89e28c740',
              alertname: 'etcdMemberCommunicationSlow',
              endpoint: 'http-metrics',
              instance: '192.168.1.33:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-master-1',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": member communication with a760cbd89e28c740 is taking 0.391168s on etcd instance 192.168.1.33:2381.',
            },
            state: 'firing',
            activeAt: '2020-08-20T07:45:15.279979961Z',
            value: '3.91168e-01',
          },
          {
            labels: {
              To: 'e52b00657d7506bf',
              alertname: 'etcdMemberCommunicationSlow',
              endpoint: 'http-metrics',
              instance: '192.168.1.18:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-bootstrap',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": member communication with e52b00657d7506bf is taking 0.20172800000000002s on etcd instance 192.168.1.18:2381.',
            },
            state: 'firing',
            activeAt: '2020-08-20T08:29:15.279979961Z',
            value: '2.0172800000000002e-01',
          },
          {
            labels: {
              To: '76b36136e1c692a5',
              alertname: 'etcdMemberCommunicationSlow',
              endpoint: 'http-metrics',
              instance: '192.168.1.18:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-bootstrap',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": member communication with 76b36136e1c692a5 is taking 0.195584s on etcd instance 192.168.1.18:2381.',
            },
            state: 'firing',
            activeAt: '2020-08-20T07:48:45.279979961Z',
            value: '1.95584e-01',
          },
          {
            labels: {
              To: 'a760cbd89e28c740',
              alertname: 'etcdMemberCommunicationSlow',
              endpoint: 'http-metrics',
              instance: '192.168.1.36:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-master-0',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": member communication with a760cbd89e28c740 is taking 0.2011136s on etcd instance 192.168.1.36:2381.',
            },
            state: 'firing',
            activeAt: '2020-08-20T07:52:15.279979961Z',
            value: '2.011136e-01',
          },
          {
            labels: {
              To: '76b36136e1c692a5',
              alertname: 'etcdMemberCommunicationSlow',
              endpoint: 'http-metrics',
              instance: '192.168.1.33:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-master-1',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": member communication with 76b36136e1c692a5 is taking 0.4022272s on etcd instance 192.168.1.33:2381.',
            },
            state: 'firing',
            activeAt: '2020-08-17T12:47:15.279979961Z',
            value: '4.022272e-01',
          },
          {
            labels: {
              alertname: 'etcdHighCommitDurations',
              endpoint: 'http-metrics',
              instance: '192.168.1.33:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-master-1',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": 99th percentile commit durations 0.2524218181818184s on etcd instance 192.168.1.33:2381.',
            },
            state: 'pending',
            activeAt: '2020-08-20T08:48:15.279979961Z',
            value: '2.524218181818184e-01',
          },
          {
            labels: {
              alertname: 'etcdHighCommitDurations',
              endpoint: 'http-metrics',
              instance: '192.168.1.36:2381',
              job: 'kube-etcd',
              namespace: 'kube-system',
              pod: 'etcd-master-0',
              service: 'prometheus-operator-kube-etcd',
              severity: 'warning',
            },
            annotations: {
              message:
                'etcd cluster "kube-etcd": 99th percentile commit durations 0.2542399999999995s on etcd instance 192.168.1.36:2381.',
            },
            state: 'pending',
            activeAt: '2020-08-20T08:50:45.279979961Z',
            value: '2.542399999999995e-01',
          },
          {
            labels: {
              alertname: 'KubeClientErrors',
              instance: '192.168.1.33:10252',
              job: 'kube-controller-manager',
              severity: 'warning',
            },
            annotations: {
              message:
                "Kubernetes API server client 'kube-controller-manager/192.168.1.33:10252' is experiencing 4.694% errors.'",
              runbook_url:
                'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-kubeclienterrors',
            },
            state: 'firing',
            activeAt: '2020-08-20T08:31:17.922103104Z',
            value: '4.6944198405668734e-02',
          },
        ],
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
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'data-zenko-zenko-quorum-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '46252032'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'datadir-zenko-zenko-queue-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '47243264'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'data-zenko-redis-ha-server-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '37789696'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'datadir-zenko-mongodb-replicaset-2',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '492261376'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_used_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim:
                  'storage-volume-zenko-prometheus-server-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932618.313, '518651904'],
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
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'data-zenko-zenko-quorum-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '5150212096'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'datadir-zenko-zenko-queue-0',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '21003583488'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'data-zenko-redis-ha-server-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '10434662400'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim: 'datadir-zenko-mongodb-replicaset-2',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '53660876800'],
            },
            {
              metric: {
                __name__: 'kubelet_volume_stats_capacity_bytes',
                endpoint: 'https-metrics',
                instance: '192.168.1.6:10250',
                job: 'kubelet',
                metrics_path: '/metrics',
                namespace: 'zenko',
                node: 'worker-1',
                persistentvolumeclaim:
                  'storage-volume-zenko-prometheus-server-1',
                service: 'prometheus-operator-kubelet',
              },
              value: [1597932619.128, '10434662400'],
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
