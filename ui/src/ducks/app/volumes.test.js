import { call, put, delay } from 'redux-saga/effects';
import history from '../../history';
import {
  ADD_NOTIFICATION_ERROR,
  ADD_NOTIFICATION_SUCCESS
} from './notifications';
import {
  fetchVolumes,
  setVolumesAction,
  fetchStorageClass,
  fetchPersistentVolumes,
  setPersistentVolumesAction,
  createVolumes,
  refreshVolumes,
  updateVolumesRefreshingAction,
  stopRefreshVolumes,
  refreshPersistentVolumes,
  updatePersistentVolumesRefreshingAction,
  updateVolumesAction,
  stopRefreshPersistentVolumes,
  updateStorageClassAction,
  deleteVolume
} from './volumes';
import * as ApiK8s from '../../services/k8s/api';
import { SET_STORAGECLASS } from './volumes.js';
import { REFRESH_TIMEOUT } from '../../constants';

it('update the volume', () => {
  const gen = fetchVolumes();
  expect(gen.next().value).toEqual(
    put(
      updateVolumesAction({
        isLoading: true
      })
    )
  );
  expect(gen.next().value).toEqual(call(ApiK8s.getVolumes));

  const result = {
    body: {
      items: [
        {
          apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
          kind: 'Volume',
          metadata: {
            creationTimestamp: '2019-07-25T16:27:18Z',
            generation: 1,
            name: 'yanjin-test',
            resourceVersion: '24324',
            selfLink:
              '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/yanjin-test',
            uid: '5e417a13-71cd-4b80-81e9-112dff5da750'
          },
          spec: {
            nodeName: 'metalk8s-bootstrap.novalocal',
            sparseLoopDevice: {
              size: '1Gi'
            },
            storageClassName: 'standard'
          }
        }
      ]
    }
  };

  expect(gen.next(result).value).toEqual(
    put(setVolumesAction(result.body.items))
  );
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put(
      updateVolumesAction({
        isLoading: false
      })
    )
  );
  const finalGen = gen.next();
  expect(finalGen.value).toEqual(result);
  expect(finalGen.done).toEqual(true);
});

it('does not update volume if there is an error', () => {
  const gen = fetchVolumes();
  expect(gen.next().value).toEqual(
    put(
      updateVolumesAction({
        isLoading: true
      })
    )
  );
  expect(gen.next().value).toEqual(call(ApiK8s.getVolumes));

  const result = { error: {} };

  expect(gen.next(result).value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put(
      updateVolumesAction({
        isLoading: false
      })
    )
  );
  const finalGen = gen.next(result);
  expect(finalGen.done).toEqual(true);
  expect(finalGen.value).toEqual(result);
});

it('should put a empty array if Volumes is not correct', () => {
  const gen = fetchVolumes();
  expect(gen.next().value).toEqual(
    put(
      updateVolumesAction({
        isLoading: true
      })
    )
  );
  expect(gen.next().value).toEqual(call(ApiK8s.getVolumes));

  const result = { it: 'should not work' };
  expect(gen.next(result).value).toEqual(put(setVolumesAction([])));
  expect(gen.next().value).toEqual(delay(1000));
  expect(gen.next().value).toEqual(
    put(
      updateVolumesAction({
        isLoading: false
      })
    )
  );
  const finalGen = gen.next();
  expect(finalGen.done).toEqual(true);
  expect(finalGen.value).toEqual(result);
});

it('update the storage class', () => {
  const gen = fetchStorageClass();

  expect(gen.next().value).toEqual(put(updateStorageClassAction(true)));
  expect(gen.next().value).toEqual(call(ApiK8s.getStorageClass));
  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'standard',
            selfLink: '/apis/storage.k8s.io/v1/storageclasses/standard',
            uid: 'ad65238e-c860-4782-bdda-f8468998086e',
            resourceVersion: '21491',
            creationTimestamp: '2019-07-25T15:52:24Z'
          },
          provisioner: 'kubernetes.io/aws-ebs',
          parameters: {
            type: 'gp2'
          },
          reclaimPolicy: 'Retain',
          mountOptions: ['debug'],
          volumeBindingMode: 'Immediate'
        }
      ]
    }
  };
  expect(gen.next(result).value).toEqual(
    put({ type: SET_STORAGECLASS, payload: result.body.items })
  );
  expect(gen.next().value).toEqual(put(updateStorageClassAction(false)));
  expect(gen.next().done).toEqual(true);
});

it('does not update the storage class if there is an error', () => {
  const gen = fetchStorageClass();
  expect(gen.next().value).toEqual(put(updateStorageClassAction(true)));
  expect(gen.next().value).toEqual(call(ApiK8s.getStorageClass));

  const result = {
    error: {}
  };
  expect(gen.next(result).value).toEqual(put(updateStorageClassAction(false)));
  expect(gen.next().done).toEqual(true);
});

it('update PVs', () => {
  const gen = fetchPersistentVolumes();
  expect(gen.next().value).toEqual(call(ApiK8s.getPersistentVolumes));

  const result = {
    body: {
      items: [
        {
          metadata: {
            name: 'yanjin-test',
            selfLink: '/api/v1/persistentvolumes/yanjin-test',
            uid: '1e949b2e-7e6f-4ba7-8dd8-eddb73d8455b',
            resourceVersion: '26098',
            creationTimestamp: '2019-07-25T16:49:10Z',
            ownerReferences: [
              {
                apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
                kind: 'Volume',
                name: 'yanjin-test',
                uid: '5e417a13-71cd-4b80-81e9-112dff5da750',
                controller: true,
                blockOwnerDeletion: true
              }
            ],
            finalizers: [
              'storage.metalk8s.scality.com/volume-protection',
              'kubernetes.io/pv-protection'
            ]
          },
          spec: {
            capacity: {
              storage: '1Gi'
            },
            local: {
              path: '/tmp/foo'
            },
            accessModes: ['ReadWriteOnce'],
            persistentVolumeReclaimPolicy: 'Retain',
            storageClassName: 'standard',
            volumeMode: 'Filesystem',
            nodeAffinity: {
              required: {
                nodeSelectorTerms: [
                  {
                    matchExpressions: [
                      {
                        key: 'kubernetes.io/hostname',
                        operator: 'In',
                        values: ['metalk8s-bootstrap.novalocal']
                      }
                    ],
                    matchFields: [
                      {
                        key: 'metadata.name',
                        operator: 'In',
                        values: ['metalk8s-bootstrap.novalocal']
                      }
                    ]
                  }
                ]
              }
            }
          },
          status: {
            phase: 'Available'
          }
        }
      ]
    }
  };

  expect(gen.next(result).value).toEqual(
    put(setPersistentVolumesAction(result.body.items))
  );
  expect(gen.next().done).toEqual(true);
});

it('should put a empty array if PVs object is not correct', () => {
  const gen = fetchPersistentVolumes();
  expect(gen.next().value).toEqual(call(ApiK8s.getPersistentVolumes));

  const result = { it: 'should not work' };

  expect(gen.next(result).value).toEqual(put(setPersistentVolumesAction([])));
  expect(gen.next().done).toEqual(true);
});

it('does not update PV if there is an error', () => {
  const gen = fetchPersistentVolumes();

  expect(gen.next().value).toEqual(call(ApiK8s.getPersistentVolumes));

  const result = {
    error: {}
  };

  expect(gen.next(result).done).toEqual(true);
});

it('create volume with the type sparseloopdevice', () => {
  const action = {
    payload: {
      newVolume: {
        name: 'volume1',
        storageClass: 'metalk8s-default',
        type: 'sparseLoopDevice',
        size: '1Gi'
      },
      nodeName: 'bootstrap'
    }
  };

  const { newVolume, nodeName } = action.payload;

  const gen = createVolumes(action);

  const body = {
    apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    kind: 'Volume',
    metadata: {
      name: newVolume.name
    },
    spec: {
      nodeName: nodeName,
      storageClassName: newVolume.storageClass,
      sparseLoopDevice: { size: newVolume.size }
    }
  };

  expect(gen.next(body).value).toEqual(call(ApiK8s.createVolume, body));
  const result = {
    body: {
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
      kind: 'Volume',
      metadata: {
        creationTimestamp: '2019-07-29T12:56:24Z',
        generation: 1,
        name: 'patrick-098765',
        resourceVersion: '345964',
        selfLink:
          '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/patrick-098765',
        uid: 'd432d9f1-7247-44d4-868e-1d4599723516'
      },
      spec: {
        nodeName: 'metalk8s-bootstrap.novalocal',
        sparseLoopDevice: {
          size: '42Gi'
        },
        storageClassName: 'standard'
      }
    }
  };

  expect(gen.next(result).value).toEqual(
    call(history.push, `/nodes/${nodeName}/volumes`)
  );

  expect(gen.next().value.payload.action.type).toEqual(
    ADD_NOTIFICATION_SUCCESS
  );

  expect(gen.next().done).toEqual(true);
});

it('create a volume with the type rawBlockdevice', () => {
  const action = {
    payload: {
      newVolume: {
        name: 'volume1',
        storageClass: 'metalk8s-default',
        type: 'rawBlockDevice',
        path: '/dev/disk1'
      },
      nodeName: 'bootstrap'
    }
  };
  const { newVolume, nodeName } = action.payload;
  const gen = createVolumes(action);

  const body = {
    apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    kind: 'Volume',
    metadata: {
      name: newVolume.name
    },
    spec: {
      nodeName: nodeName,
      storageClassName: newVolume.storageClass,
      rawBlockDevice: { devicePath: newVolume.path }
    }
  };

  expect(gen.next(body).value).toEqual(call(ApiK8s.createVolume, body));
  const result = {
    body: {
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
      kind: 'Volume',
      metadata: {
        creationTimestamp: '2019-07-29T12:56:24Z',
        generation: 1,
        name: 'patrick-098765',
        resourceVersion: '345964',
        selfLink:
          '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/patrick-098765',
        uid: 'd432d9f1-7247-44d4-868e-1d4599723516'
      },
      spec: {
        nodeName: 'metalk8s-bootstrap.novalocal',
        rawBlockDevice: { devicePath: '/dev/disk1' },
        storageClassName: 'standard'
      }
    }
  };

  expect(gen.next(result).value).toEqual(
    call(history.push, `/nodes/${nodeName}/volumes`)
  );
  expect(gen.next().value.payload.action.type).toEqual(
    ADD_NOTIFICATION_SUCCESS
  );

  expect(gen.next().done).toEqual(true);
});

it('display a notification when the params are wrong', () => {
  const action = {
    payload: {
      newVolume: {
        name: 'volume1',
        storageClass: 'metalk8s-default',
        type: 'rawBlockDevice',
        path: ''
      },
      nodeName: 'bootstrap'
    }
  };

  const gen = createVolumes(action);

  expect(gen.next().value.payload.action.type).toEqual(ADD_NOTIFICATION_ERROR);
  expect(gen.next().done).toEqual(true);
});

it('does not create a volume when there is an error', () => {
  const action = {
    payload: {
      newVolume: {
        name: 'volume1',
        storageClass: 'metalk8s-default',
        type: 'rawBlockDevice',
        path: '/dev/disk1'
      },
      nodeName: 'bootstrap'
    }
  };
  const { newVolume, nodeName } = action.payload;
  const gen = createVolumes(action);
  const body = {
    apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
    kind: 'Volume',
    metadata: {
      name: newVolume.name
    },
    spec: {
      nodeName: nodeName,
      storageClassName: newVolume.storageClass,
      rawBlockDevice: { devicePath: newVolume.path }
    }
  };
  expect(gen.next(body).value).toEqual(call(ApiK8s.createVolume, body));
  const result = { error: {} };

  expect(gen.next(result).value.payload.action.type).toEqual(
    ADD_NOTIFICATION_ERROR
  );

  expect(gen.next().done).toEqual(true);
});

it('should refresh volume', () => {
  const gen = refreshVolumes();
  expect(gen.next().value).toEqual(put(updateVolumesRefreshingAction(true)));
  expect(gen.next().value).toEqual(call(fetchVolumes));

  const result = {};
  expect(gen.next(result).value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next(true).value).toEqual(call(refreshVolumes));
  expect(gen.next().done).toEqual(true);
});

it('should not refresh volume if you leave the page', () => {
  const gen = refreshVolumes();
  expect(gen.next().value).toEqual(put(updateVolumesRefreshingAction(true)));
  expect(gen.next().value).toEqual(call(fetchVolumes));
  const result = {};
  expect(gen.next(result).value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');

  expect(gen.next(false).done).toEqual(true);
});

it('should not refresh volume if volume have an error', () => {
  const gen = refreshVolumes();
  expect(gen.next().value).toEqual(put(updateVolumesRefreshingAction(true)));
  expect(gen.next().value).toEqual(call(fetchVolumes));
  const result = { error: {} };
  expect(gen.next(result).done).toEqual(true);
});

it('should stop refresh volume', () => {
  const gen = stopRefreshVolumes();
  expect(gen.next().value).toEqual(put(updateVolumesRefreshingAction(false)));
  expect(gen.next().done).toEqual(true);
});

it('should refresh the pesistent volume', () => {
  const gen = refreshPersistentVolumes();
  expect(gen.next().value).toEqual(
    put(updatePersistentVolumesRefreshingAction(true))
  );
  expect(gen.next().value).toEqual(call(fetchPersistentVolumes));
  const result = {
    items: [
      {
        metadata: {
          name: 'gdmlgerml',
          selfLink: '/api/v1/persistentvolumes/gdmlgerml',
          uid: 'd0dda5b7-bc7a-48ed-8c1e-7f32a1adfa65',
          resourceVersion: '702250',
          creationTimestamp: '2019-08-01T14:09:15Z',
          ownerReferences: [
            {
              apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
              kind: 'Volume',
              name: 'gdmlgerml',
              uid: '316c0dc0-3cfc-48f3-8062-eb0dd4ce6108',
              controller: true,
              blockOwnerDeletion: true
            }
          ],
          finalizers: [
            'storage.metalk8s.scality.com/volume-protection',
            'kubernetes.io/pv-protection'
          ]
        },
        spec: {
          capacity: {
            storage: '12345676432'
          },
          local: {
            path:
              '/var/lib/metalk8s/storage/sparse/316c0dc0-3cfc-48f3-8062-eb0dd4ce6108'
          },
          accessModes: ['ReadWriteOnce'],
          persistentVolumeReclaimPolicy: 'Retain',
          storageClassName: 'standard',
          volumeMode: 'Filesystem',
          nodeAffinity: {
            required: {
              nodeSelectorTerms: [
                {
                  matchExpressions: [
                    {
                      key: 'kubernetes.io/hostname',
                      operator: 'In',
                      values: ['metalk8s-bootstrap.novalocal']
                    }
                  ],
                  matchFields: [
                    {
                      key: 'metadata.name',
                      operator: 'In',
                      values: ['metalk8s-bootstrap.novalocal']
                    }
                  ]
                }
              ]
            }
          }
        },
        status: {
          phase: 'Available'
        }
      }
    ]
  };
  expect(gen.next(result).value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next(true).value).toEqual(call(refreshPersistentVolumes));
  expect(gen.next().done).toEqual(true);
});

it('should not refresh the pesistent volume if there is error', () => {
  const gen = refreshPersistentVolumes();
  expect(gen.next().value).toEqual(
    put(updatePersistentVolumesRefreshingAction(true))
  );
  expect(gen.next().value).toEqual(call(fetchPersistentVolumes));
  const result = { error: {} };
  expect(gen.next(result).done).toEqual(true);
});

it('should stop refresh persistent volume', () => {
  const gen = stopRefreshPersistentVolumes();
  expect(gen.next().value).toEqual(
    put(updatePersistentVolumesRefreshingAction(false))
  );
  expect(gen.next().done).toEqual(true);
});

it('should not refresh persistent volume if you leave the page', () => {
  const gen = refreshPersistentVolumes();
  expect(gen.next().value).toEqual(
    put(updatePersistentVolumesRefreshingAction(true))
  );
  expect(gen.next().value).toEqual(call(fetchPersistentVolumes));
  const result = {};
  expect(gen.next(result).value).toEqual(delay(REFRESH_TIMEOUT));
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next(false).done).toEqual(true);
});

it('should not refresh volume if volume have an error', () => {
  const gen = refreshPersistentVolumes();
  expect(gen.next().value).toEqual(
    put(updatePersistentVolumesRefreshingAction(true))
  );
  expect(gen.next().value).toEqual(call(fetchPersistentVolumes));
  const result = { error: {} };
  expect(gen.next(result).done).toEqual(true);
});

it('should delete volume', () => {
  const payload = { payload: 'test-volume' };
  const gen = deleteVolume(payload);
  expect(gen.next().value).toEqual(call(ApiK8s.deleteVolume, 'test-volume'));
  const result = {
    body: {
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
      kind: 'Volume',
      metadata: {
        creationTimestamp: '2019-08-13T06:56:43Z',
        deletionGracePeriodSeconds: 0,
        deletionTimestamp: '2019-08-13T07:04:11Z',
        finalizers: ['storage.metalk8s.scality.com/volume-protection'],
        generation: 2,
        name: 'yanjin-volume-for-test',
        resourceVersion: '1870920',
        selfLink:
          '/apis/storage.metalk8s.scality.com/v1alpha1/volumes/yanjin-volume-for-test',
        uid: 'dcf7e212-16aa-48df-a275-0bcb73410a8c'
      },
      spec: {
        nodeName: 'metalk8s-bootstrap.novalocal',
        sparseLoopDevice: {
          size: '45Gi'
        },
        storageClassName: 'metalk8s-prometheus'
      },
      status: {
        phase: 'Available'
      }
    }
  };
  expect(gen.next(result).value.payload.action.type).toEqual(
    ADD_NOTIFICATION_SUCCESS
  );
  expect(gen.next().value).toEqual(call(fetchVolumes));
  expect(gen.next().done).toEqual(true);
});

it('should display the error notification when there is error in delete volume', () => {
  const payload = { payload: 'test-volume' };
  const gen = deleteVolume(payload);
  expect(gen.next().value).toEqual(call(ApiK8s.deleteVolume, 'test-volume'));
  const result = { error: {} };
  expect(gen.next(result).value.payload.action.type).toEqual(
    ADD_NOTIFICATION_ERROR
  );
  expect(gen.next().value).toEqual(call(fetchVolumes));
  expect(gen.next().done).toEqual(true);
});
