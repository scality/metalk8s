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
          return false;
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
