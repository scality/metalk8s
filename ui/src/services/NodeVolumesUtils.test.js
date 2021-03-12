import {
  STATUS_UNKNOWN,
  STATUS_TERMINATING,
  STATUS_PENDING,
  STATUS_FAILED,
  STATUS_READY,
} from '../constants';
import {
  computeVolumeGlobalStatus,
  isVolumeDeletable,
  volumeGetError,
  getVolumeListData,
  formatVolumeCreationData,
  formatBatchName,
} from './NodeVolumesUtils';
import { stateApp } from './NodeVolumesUtilsData';

// isVolumeDeletable {{{
// Test data {{{
const testcaseVolumeUnknown = {
  status: 'Unknown',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumePending = {
  status: 'Pending',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeTerminating = {
  status: 'Terminating',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeFailedWithoutPv = {
  status: 'Failed',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'testnoPV' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeFailedPvFailed = {
  status: 'Failed',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Failed' } },
  ],
};

const testcaseVolumeFailedPvAvailable = {
  status: 'Failed',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeFailedPvReleased = {
  status: 'Failed',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Released' } },
  ],
};

const testcaseVolumeFailedPvPending = {
  status: 'Failed',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Pending' } },
  ],
};

const testcaseVolumeFailedPvBound = {
  status: 'Failed',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Bound' } },
  ],
};

const testcaseVolumeFailedPvUnknown = {
  status: 'Failed',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Unknown' } },
  ],
};

const testcaseVolumeReadyPvFailed = {
  status: 'Ready',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Failed' } },
  ],
};

const testcaseVolumeReadyPvAvailable = {
  status: 'Ready',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeReadyPvReleased = {
  status: 'Ready',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Released' } },
  ],
};

const testcaseVolumeAvailablePvPending = {
  status: 'Ready',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Pending' } },
  ],
};

const testcaseVolumeReadyPvBound = {
  status: 'Ready',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Bound' } },
  ],
};

const testcaseVolumeReadyPvUnknown = {
  status: 'Ready',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Unknown' } },
  ],
};

const testcaseVolumeReadyWithoutPv = {
  status: 'Ready',
  name: 'test',
  persistentVolumes: [
    { metadata: { name: 'testnoPV' }, status: { phase: 'Available' } },
  ],
};

// }}}
// Test cases {{{

it('should return false when volume is unknown', () => {
  const result = isVolumeDeletable(
    testcaseVolumeUnknown.status,
    testcaseVolumeUnknown.name,
    testcaseVolumeUnknown.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is pending', () => {
  const result = isVolumeDeletable(
    testcaseVolumePending.status,
    testcaseVolumePending.name,
    testcaseVolumePending.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is terminating', () => {
  const result = isVolumeDeletable(
    testcaseVolumeTerminating.status,
    testcaseVolumeTerminating.name,
    testcaseVolumeTerminating.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is failed and there is no PV', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedWithoutPv.status,
    testcaseVolumeFailedWithoutPv.name,
    testcaseVolumeFailedWithoutPv.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is failed and PV is failed', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvFailed.status,
    testcaseVolumeFailedPvFailed.name,
    testcaseVolumeFailedPvFailed.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is failed and PV is available', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvAvailable.status,
    testcaseVolumeFailedPvAvailable.name,
    testcaseVolumeFailedPvAvailable.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is failed and PV is released', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvReleased.status,
    testcaseVolumeFailedPvReleased.name,
    testcaseVolumeFailedPvReleased.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return false when volume is failed and PV is pending', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvPending.status,
    testcaseVolumeFailedPvPending.name,
    testcaseVolumeFailedPvPending.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is failed and PV is bound', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvBound.status,
    testcaseVolumeFailedPvBound.name,
    testcaseVolumeFailedPvBound.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is failed and PV is unknown', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvUnknown.status,
    testcaseVolumeFailedPvUnknown.name,
    testcaseVolumeFailedPvUnknown.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return true when volume is ready and PV is failed', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvFailed.status,
    testcaseVolumeReadyPvFailed.name,
    testcaseVolumeReadyPvFailed.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is ready and PV is available', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvAvailable.status,
    testcaseVolumeReadyPvAvailable.name,
    testcaseVolumeReadyPvAvailable.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is ready and PV is released', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvReleased.status,
    testcaseVolumeReadyPvReleased.name,
    testcaseVolumeReadyPvReleased.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return false when volume is ready and PV is pending', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvPending.status,
    testcaseVolumeAvailablePvPending.name,
    testcaseVolumeAvailablePvPending.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is ready and PV is bound', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvBound.status,
    testcaseVolumeReadyPvBound.name,
    testcaseVolumeReadyPvBound.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is ready and PV is unknown', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvUnknown.status,
    testcaseVolumeReadyPvUnknown.name,
    testcaseVolumeReadyPvUnknown.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is ready and there is no PV', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyWithoutPv.status,
    testcaseVolumeReadyWithoutPv.name,
    testcaseVolumeReadyWithoutPv.persistentVolumes,
  );
  expect(result).toEqual(true);
});

// }}}
// }}}
// computeVolumeGlobalStatus {{{

it('should return Unkown when called with wrong input', () => {
  const volume = {
    status: { conditions: [] },
  };
  const result = computeVolumeGlobalStatus('test', volume);
  expect(result).toEqual(STATUS_UNKNOWN);
});

it('should return Unkown when volume has no status', () => {
  const result = computeVolumeGlobalStatus('test', undefined);
  expect(result).toEqual(STATUS_UNKNOWN);
});

it('should return Unkown when volume has no conditions', () => {
  const volumeStatus = { conditions: [] };
  const result = computeVolumeGlobalStatus('test', volumeStatus);
  expect(result).toEqual(STATUS_UNKNOWN);
});

it('should return Unkown when volume has no Ready condition', () => {
  const volumeStatus = { conditions: [{ type: 'nope' }] };
  const result = computeVolumeGlobalStatus('test', volumeStatus);
  expect(result).toEqual(STATUS_UNKNOWN);
});

it('should return Ready when Ready condition is True', () => {
  const volumeStatus = { conditions: [{ type: 'Ready', status: 'True' }] };
  const result = computeVolumeGlobalStatus('test', volumeStatus);
  expect(result).toEqual(STATUS_READY);
});

it('should return Failed when Ready condition is False', () => {
  const volumeStatus = { conditions: [{ type: 'Ready', status: 'False' }] };
  const result = computeVolumeGlobalStatus('test', volumeStatus);
  expect(result).toEqual(STATUS_FAILED);
});

it('should return Pending when Ready condition is Unknown/Pending', () => {
  const volumeStatus = {
    conditions: [{ type: 'Ready', status: 'Unknown', reason: 'Pending' }],
  };
  const result = computeVolumeGlobalStatus('test', volumeStatus);
  expect(result).toEqual(STATUS_PENDING);
});

it('should return Pending when Ready condition is Unknown/Terminating', () => {
  const volumeStatus = {
    conditions: [{ type: 'Ready', status: 'Unknown', reason: 'Terminating' }],
  };
  const result = computeVolumeGlobalStatus('test', volumeStatus);
  expect(result).toEqual(STATUS_TERMINATING);
});

// }}}
// volumeGetError {{{

const NO_ERROR = ['', ''];

it('should return no error when called with wrong input', () => {
  const volume = {
    status: { conditions: [] },
  };
  const result = volumeGetError(volume);
  expect(result).toEqual(NO_ERROR);
});

it('should return no error when called with no status', () => {
  const result = volumeGetError(undefined);
  expect(result).toEqual(NO_ERROR);
});

it('should return no error when called with no conditions', () => {
  const volumeStatus = { conditions: [] };
  const result = volumeGetError(volumeStatus);
  expect(result).toEqual(NO_ERROR);
});

it('should return no error when called with no Ready conditions', () => {
  const volumeStatus = { conditions: [{ type: 'nope' }] };
  const result = volumeGetError(volumeStatus);
  expect(result).toEqual(NO_ERROR);
});

it('should return no error when called with successful Ready condition', () => {
  const volumeStatus = { conditions: [{ type: 'Ready', status: 'True' }] };
  const result = volumeGetError(volumeStatus);
  expect(result).toEqual(NO_ERROR);
});

it('should return no error when called with pending Ready condition', () => {
  const volumeStatus = { conditions: [{ type: 'Ready', status: 'Unknown' }] };
  const result = volumeGetError(volumeStatus);
  expect(result).toEqual(NO_ERROR);
});

it('should return error when called with failed Ready condition', () => {
  const volumeStatus = {
    conditions: [
      {
        type: 'Ready',
        status: 'False',
        reason: 'CreationError',
        message: 'BOOM',
      },
    ],
  };
  const result = volumeGetError(volumeStatus);
  expect(result).toEqual(['CreationError', 'BOOM']);
});

// }}}

// test for getVolumeListData function
const propsWithNodeFilter = {
  location: {
    pathname: '/volumes',
    search: '?node=master-0',
  },
};

it('should return the volume list filtered by a specific node', () => {
  const result = getVolumeListData(stateApp, propsWithNodeFilter);
  const volumelistFilteredByNode = [
    {
      name: 'master-0-alertmanager',
      node: 'master-0',
      usage: '0.41',
      status: 'link',
      bound: 'Yes',
      storageCapacity: '5Gi',
      storageClass: 'metalk8s',
      usageRawData: '20MiB',
      health: 'healthy',
      latency: undefined,
    },
    {
      name: 'prom-m0-reldev',
      node: 'master-0',
      usage: '22.87',
      status: 'link',
      bound: 'Yes',
      storageCapacity: '20Gi',
      storageClass: 'metalk8s',
      usageRawData: '4GiB',
      health: 'healthy',
      latency: 900,
    },
  ];
  expect(result).toEqual(volumelistFilteredByNode);
});

const propsWrongNodeFilter = {
  location: {
    pathname: '/volumes',
    search: '?node=fake-node-name',
  },
};

it('should return an empty array when the node filter in URL does not exist', () => {
  const result = getVolumeListData(stateApp, propsWrongNodeFilter);
  expect(result).toEqual([]);
});

const propsWithNonVolumeNodeFilter = {
  location: {
    pathname: '/volumes',
    search: '?node=bootstrap',
  },
};
it('should return an empty array when there is no volume in this node', () => {
  const result = getVolumeListData(stateApp, propsWithNonVolumeNodeFilter);
  expect(result).toEqual([]);
});

const stateEmptyVolume = {
  app: {
    nodes: {
      list: [],
    },
    pods: {},
    volumes: { list: [], storageClass: [], pVList: [] },
  },
};
const props = {
  location: {
    pathname: '/volumes',
    search: '',
  },
};

// Todo: in this case, it should be redirect to the Empty State Page.
it('should return an empty array when there is no volume at all in this platform', () => {
  const result = getVolumeListData(stateEmptyVolume, props);
  expect(result).toEqual([]);
});

// The tests of `formatVolumeCreationData` function
const singleVolume = {
  name: 'volume-test',
  node: 'expansion',
  storageClass: 'metalk8s',
  type: 'sparseLoopDevice',
  path: '',
  selectedUnit: 'Gi',
  sizeInput: '2',
  labels: {},
  multiVolumeCreation: false,
  numberOfVolumes: 1,
  volumes: [
    {
      name: '',
      path: '',
    },
  ],
  size: '2Gi',
};
it('should return a single array containing one volume', () => {
  const result = formatVolumeCreationData(singleVolume);
  expect(result).toEqual([singleVolume]);
});

const sparseLoopVolumes = {
  name: 'batch-volume',
  node: 'expansion',
  storageClass: 'metalk8s',
  type: 'sparseLoopDevice',
  path: '',
  selectedUnit: 'Gi',
  sizeInput: '1',
  labels: {},
  multiVolumeCreation: true,
  numberOfVolumes: '3',
  volumes: [
    {
      name: 'batch-volume1',
      path: '',
    },
    {
      name: 'batch-volume2',
      path: '',
    },
    {
      name: 'batch-volume3',
      path: '',
    },
  ],
  size: '3Gi',
};
const rawBlockVolumes = {
  name: 'batch-volume',
  node: 'expansion',
  storageClass: 'metalk8s',
  type: 'rawBlockDevice',
  path: '/dev/vda',
  labels: {},
  multiVolumeCreation: true,
  numberOfVolumes: '3',
  volumes: [
    {
      name: 'batch-volume1',
      path: '/dev/vda',
    },
    {
      name: 'batch-volume2',
      path: '/dev/vdb',
    },
    {
      name: 'batch-volume3',
      path: '/dev/vdc',
    },
  ],
};

const batchSparseLoopVolume = [
  {
    name: 'batch-volume1',
    node: 'expansion',
    path: '',
    labels: {},
    type: 'sparseLoopDevice',
    size: '3Gi',
    storageClass: 'metalk8s',
  },
  {
    name: 'batch-volume2',
    node: 'expansion',
    path: '',
    labels: {},
    type: 'sparseLoopDevice',
    size: '3Gi',
    storageClass: 'metalk8s',
  },
  {
    name: 'batch-volume3',
    node: 'expansion',
    path: '',
    labels: {},
    type: 'sparseLoopDevice',
    size: '3Gi',
    storageClass: 'metalk8s',
  },
];

const batchRawVolume = [
  {
    name: 'batch-volume1',
    node: 'expansion',
    path: '/dev/vda',
    labels: {},
    type: 'rawBlockDevice',
    storageClass: 'metalk8s',
  },
  {
    name: 'batch-volume2',
    node: 'expansion',
    path: '/dev/vdb',
    labels: {},
    type: 'rawBlockDevice',
    storageClass: 'metalk8s',
  },
  {
    name: 'batch-volume3',
    node: 'expansion',
    path: '/dev/vdc',
    labels: {},
    type: 'rawBlockDevice',
    storageClass: 'metalk8s',
  },
];

it('should return an array with formatted batch volume', () => {
  const result = formatVolumeCreationData(sparseLoopVolumes);
  expect(result).toEqual(batchSparseLoopVolume);
});

it('should return an array with formatted batch rawblock device volume', () => {
  const result = formatVolumeCreationData(rawBlockVolumes);
  expect(result).toEqual(batchRawVolume);
});

it('should volume01 when the index is 1', () => {
  const result = formatBatchName('volume', 1);
  expect(result).toEqual('volume01');
});

it('should volume09 when the index is 9', () => {
  const result = formatBatchName('volume', 9);
  expect(result).toEqual('volume09');
});

it('should volume09 when the index is 10', () => {
  const result = formatBatchName('volume', 10);
  expect(result).toEqual('volume10');
});
