import { isVolumeDeletable } from './NodeVolumesUtils';

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

const testcaseVolumeAvailablePvFailed = {
  rowData: { status: 'Available', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Failed' } },
  ],
};

const testcaseVolumeAvailablePvAvailable = {
  rowData: { status: 'Available', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Available' } },
  ],
};

const testcaseVolumeAvailablePvReleased = {
  rowData: { status: 'Available', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Released' } },
  ],
};

const testcaseVolumeAvailablePvPending = {
  rowData: { status: 'Available', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Pending' } },
  ],
};

const testcaseVolumeAvailablePvBound = {
  rowData: { status: 'Available', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Bound' } },
  ],
};

const testcaseVolumeAvailablePvUnknown = {
  rowData: { status: 'Available', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'test' }, status: { phase: 'Unknown' } },
  ],
};

const testcaseVolumeAvailableWithoutPv = {
  rowData: { status: 'Available', name: 'test' },
  persistentVolumes: [
    { metadata: { name: 'testnoPV' }, status: { phase: 'Available' } },
  ],
};

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
  expect(result).toEqual(false);
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

it('should return true when volume is available and PV is failed', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvFailed.rowData,
    testcaseVolumeAvailablePvFailed.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is available and PV is available', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvAvailable.rowData,
    testcaseVolumeAvailablePvAvailable.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return true when volume is available and PV is released', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvReleased.rowData,
    testcaseVolumeAvailablePvReleased.persistentVolumes,
  );
  expect(result).toEqual(true);
});

it('should return false when volume is available and PV is pending', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvPending.rowData,
    testcaseVolumeAvailablePvPending.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is available and PV is bound', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvBound.rowData,
    testcaseVolumeAvailablePvBound.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is available and PV is unknown', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailablePvUnknown.rowData,
    testcaseVolumeAvailablePvUnknown.persistentVolumes,
  );
  expect(result).toEqual(false);
});

it('should return false when volume is available and there is no PV', () => {
  const result = isVolumeDeletable(
    testcaseVolumeAvailableWithoutPv.rowData,
    testcaseVolumeAvailableWithoutPv.persistentVolumes,
  );
  expect(result).toEqual(false);
});
