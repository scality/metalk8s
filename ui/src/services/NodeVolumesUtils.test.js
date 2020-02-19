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
} from './NodeVolumesUtils';

// isVolumeDeletable {{{
// Test data {{{

const testcaseVolumeUnknown = {
  rowData: { status: 'Unknown', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumePending = {
  rowData: { status: 'Pending', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeTerminating = {
  rowData: { status: 'Terminating', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeFailedWithoutPv = {
  rowData: { status: 'Failed', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'testnoPV' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeFailedPvFailed = {
  rowData: { status: 'Failed', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Failed' } },
  ],
};

const testcaseVolumeFailedPvAvailable = {
  rowData: { status: 'Failed', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeFailedPvReleased = {
  rowData: { status: 'Failed', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Released' } },
  ],
};

const testcaseVolumeFailedPvPending = {
  rowData: { status: 'Failed', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Pending' } },
  ],
};

const testcaseVolumeFailedPvBound = {
  rowData: { status: 'Failed', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Bound' } },
  ],
};

const testcaseVolumeFailedPvUnknown = {
  rowData: { status: 'Failed', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Unknown' } },
  ],
};

const testcaseVolumeReadyPvFailed = {
  rowData: { status: 'Ready', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Failed' } },
  ],
};

const testcaseVolumeReadyPvAvailable = {
  rowData: { status: 'Ready', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeReadyPvReleased = {
  rowData: { status: 'Ready', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Released' } },
  ],
};

const testcaseVolumeAvailablePvPending = {
  rowData: { status: 'Ready', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Pending' } },
  ],
};

const testcaseVolumeReadyPvBound = {
  rowData: { status: 'Ready', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Bound' } },
  ],
};

const testcaseVolumeReadyPvUnknown = {
  rowData: { status: 'Ready', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Unknown' } },
  ],
};

const testcaseVolumeReadyWithoutPv = {
  rowData: { status: 'Ready', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'testnoPV' }, status: { phase: 'Available' } },
  ],
};

// }}}
// Test cases {{{

it('should return false when volume is unknown', () => {
  const result = isVolumeDeletable(
    testcaseVolumeUnknown.rowData,
    testcaseVolumeUnknown.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is pending', () => {
  const result = isVolumeDeletable(
    testcaseVolumePending.rowData,
    testcaseVolumePending.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is terminating', () => {
  const result = isVolumeDeletable(
    testcaseVolumeTerminating.rowData,
    testcaseVolumeTerminating.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is failed and there is no PV', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedWithoutPv.rowData,
    testcaseVolumeFailedWithoutPv.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is failed and PV is failed', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvFailed.rowData,
    testcaseVolumeFailedPvFailed.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is failed and PV is available', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvAvailable.rowData,
    testcaseVolumeFailedPvAvailable.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is failed and PV is released', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvReleased.rowData,
    testcaseVolumeFailedPvReleased.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return false when volume is failed and PV is pending', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvPending.rowData,
    testcaseVolumeFailedPvPending.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is failed and PV is bound', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvBound.rowData,
    testcaseVolumeFailedPvBound.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is failed and PV is unknown', () => {
  const result = isVolumeDeletable(
    testcaseVolumeFailedPvUnknown.rowData,
    testcaseVolumeFailedPvUnknown.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return true when volume is ready and PV is failed', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvFailed.rowData,
    testcaseVolumeReadyPvFailed.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is ready and PV is available', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvAvailable.rowData,
    testcaseVolumeReadyPvAvailable.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is ready and PV is released', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvReleased.rowData,
    testcaseVolumeReadyPvReleased.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return false when volume is ready and PV is pending', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvPending.rowData,
    testcaseVolumeAvailablePvPending.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is ready and PV is bound', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvBound.rowData,
    testcaseVolumeReadyPvBound.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is ready and PV is unknown', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyPvUnknown.rowData,
    testcaseVolumeReadyPvUnknown.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is ready and there is no PV', () => {
  const result = isVolumeDeletable(
    testcaseVolumeReadyWithoutPv.rowData,
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
