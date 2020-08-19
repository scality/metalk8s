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
