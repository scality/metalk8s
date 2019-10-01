import {
  STATUS_UNKNOWN,
  STATUS_TERMINATING,
  STATUS_PENDING,
  STATUS_FAILED,
  STATUS_AVAILABLE,
  STATUS_BOUND,
  STATUS_RELEASED,
} from '../constants';

export const isVolumeDeletable = (rowData, persistentVolumes) => {
  const volumeStatus = rowData.status;
  const volumeName = rowData.name;

  switch (volumeStatus) {
    case STATUS_UNKNOWN:
    case STATUS_PENDING:
    case STATUS_TERMINATING:
      return false;
    case STATUS_FAILED:
    case STATUS_AVAILABLE:
      if (persistentVolumes?.length === 0) {
        return true;
      } else {
        const persistentVolume = persistentVolumes.find(
          pv => pv?.metadata?.name === volumeName,
        );
        if (!persistentVolume) {
          return true;
        }
        const persistentVolumeStatus = persistentVolume?.status?.phase;

        switch (persistentVolumeStatus) {
          case STATUS_FAILED:
          case STATUS_AVAILABLE:
          case STATUS_RELEASED:
            return true;
          case STATUS_PENDING:
          case STATUS_BOUND:
          case STATUS_UNKNOWN:
            return false;
          default:
            console.error(
              `Unexpected state for PersistentVolume ${volumeName}:${persistentVolumeStatus}`,
            );
            return false;
        }
      }
    default:
      console.error(
        `Unexpected state for Volume ${volumeName}:${volumeStatus}`,
      );
      return false;
  }
};


// Compute the global status of a volume from its conditions.
//
// Arguments
//     name:    the volume name
//     status:  the volume Status field
//
// Returns
//     The computed global status of the volume.
export const computeVolumeGlobalStatus = (name, status) => {
  if (!Array.isArray(status?.conditions)) {
    return STATUS_UNKNOWN;
  }
  const condition = status?.conditions.find(
    condition => condition.type === 'Ready',
  );

  if (condition === undefined) {
    return STATUS_UNKNOWN;
  }

  const condStatus = condition?.status;
  const condReason = condition?.reason;

  switch(condStatus) {
  case 'True':
    return STATUS_AVAILABLE;
  case 'False':
    return STATUS_FAILED;
  case 'Unknown':
    switch(condReason) {
    case 'Pending':
      return STATUS_PENDING;
    case 'Terminating':
      return STATUS_TERMINATING;
    default:
      console.error(
        `Unexpected Ready reason for Volume ${name}: ${condReason}`,
      );
      return STATUS_UNKNOWN;
    }
  default:
    console.error(
      `Unexpected Ready status for Volume ${name}: ${condStatus}`,
    );
    return STATUS_UNKNOWN;
  }
};

// Extract the error code and message from the conditions.
//
// Arguments
//     status:  the volume Status field
//
// Returns
//     a tuple (error code, error message).
export const volumeGetError = status => {
  if (!Array.isArray(status?.conditions)) {
    return ['', ''];
  }
  const condition = status?.conditions.find(
    condition => condition.type === 'Ready',
  );

  return [condition?.reason ?? '', condition?.message ?? ''];
};
