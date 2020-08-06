import { createSelector } from 'reselect';
import {
  getNodeNameFromUrl,
  getVolumes,
  computeVolumeCondition,
  allSizeUnitsToBytes,
  formatDate,
  bytesToSize,
} from './utils.js';
import {
  STATUS_UNKNOWN,
  STATUS_TERMINATING,
  STATUS_PENDING,
  STATUS_FAILED,
  STATUS_AVAILABLE,
  STATUS_BOUND,
  STATUS_RELEASED,
  STATUS_READY,
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_NONE,
  STATUS_HEALTH,
} from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

export const isVolumeDeletable = (
  volumeStatus,
  volumeName,
  persistentVolumes,
) => {
  switch (volumeStatus) {
    case STATUS_UNKNOWN:
    case STATUS_PENDING:
    case STATUS_TERMINATING:
      return false;
    case STATUS_FAILED:
    case STATUS_READY:
      if (persistentVolumes?.length === 0) {
        return true;
      } else {
        const persistentVolume = persistentVolumes.find(
          (pv) => pv?.metadata?.name === volumeName,
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
    (condition) => condition.type === 'Ready',
  );

  if (condition === undefined) {
    return STATUS_UNKNOWN;
  }

  const condStatus = condition?.status;
  const condReason = condition?.reason;

  switch (condStatus) {
    case 'True':
      return STATUS_READY;
    case 'False':
      return STATUS_FAILED;
    case 'Unknown':
      switch (condReason) {
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
export const volumeGetError = (status) => {
  if (!Array.isArray(status?.conditions)) {
    return ['', ''];
  }
  const condition = status?.conditions.find(
    (condition) => condition.type === 'Ready',
  );

  return [condition?.reason ?? '', condition?.message ?? ''];
};

const getPVList = (state) => state?.app?.volumes?.pVList;
const getPVCList = (state) => state?.app?.volumes?.pVCList;
const getVolumeUsedCurrent = (state) =>
  state?.app?.monitoring?.volumeStats?.volumeUsedCurrent;

const getAlerts = (state) => state?.app?.monitoring?.alert;

const getVolumeLatencyCurrent = (state) =>
  state?.app?.monitoring?.volumeStats?.volumeLatencyCurrent;

// Todo: Add unit test for getVolumeListData function
export const getVolumeListData = createSelector(
  getNodeNameFromUrl,
  getVolumes,
  getPVList,
  getPVCList,
  getVolumeUsedCurrent,
  getAlerts,
  getVolumeLatencyCurrent,
  (
    nodeName,
    volumes,
    pVList,
    pVCList,
    volumeUsedCurrentList,
    alerts,
    volumeLatencyCurrent,
  ) => {
    // filter the volumes by the Node from URL
    volumes.filter(
      (volume) => volume && volume.spec && volume.spec.nodeName === nodeName,
    );

    return volumes.map((volume) => {
      const volumePV = pVList.find(
        (pV) => pV.metadata.name === volume.metadata.name,
      );
      // find the mapping PVC of this specific volume
      const volumePVC = pVCList.find(
        (pVC) => pVC.spec.volumeName === volume.metadata.name,
      );
      const volumeComputedCondition = computeVolumeCondition(
        computeVolumeGlobalStatus(volume.metadata.name, volume?.status),
        volumePV?.status?.phase === STATUS_BOUND
          ? intl.translate('yes')
          : intl.translate('no'),
      );

      let volumeUsedCurren = null;
      let volumeAlerts = [];
      let volumeHealth = '';

      // if volume is bounded
      if (volumePVC) {
        volumeUsedCurren = volumeUsedCurrentList?.find(
          (volStat) =>
            volStat.metric.persistentvolumeclaim === volumePVC.metadata.name,
        );

        // filter the alerts related to the current volume.
        volumeAlerts = alerts?.list?.filter(
          (alert) =>
            alert.labels.persistentvolumeclaim === volumePVC.metadata.name,
        );
      } else {
        volumeHealth = STATUS_NONE;
      }

      // THE RULES TO COMPUTE THE HEALTH
      // compute the volume health based on the severity of the alerts
      // critical => if there is at least one critical
      if (volumeAlerts.length) {
        volumeHealth = volumeAlerts.find(
          (vol) => vol.labels.severity === STATUS_CRITICAL,
        )
          ? STATUS_CRITICAL
          : STATUS_WARNING;
      } else if (volumeComputedCondition === ('exclamation' || 'unlink')) {
        volumeHealth = STATUS_NONE;
      } else {
        volumeHealth = STATUS_HEALTH;
      }

      return {
        name: volume?.metadata?.name,
        usage: volumeUsedCurren?.value[1]
          ? Math.round(
              (volumeUsedCurren?.value[1] /
                (volumePV?.spec?.capacity?.storage &&
                  allSizeUnitsToBytes(volumePV?.spec?.capacity?.storage))) *
                100,
            )
          : intl.translate('unknown'),
        status: volumeComputedCondition,
        bound:
          volumePV?.status?.phase === STATUS_BOUND
            ? intl.translate('yes')
            : intl.translate('no'),
        storageCapacity:
          volumePV?.spec?.capacity?.storage || intl.translate('unknown'),
        storageClass: volume?.spec?.storageClassName,
        creationTime: formatDate(volume?.metadata?.creationTimestamp),
        usageRawData: volumeUsedCurren?.value[1]
          ? bytesToSize(volumeUsedCurren?.value[1])
          : 0,
        health: volumeHealth,
        latency:
          volumeLatencyCurrent &&
          volumeLatencyCurrent?.find(
            (vLV) => vLV.metric.device === volume.status.deviceName,
          )
            ? Math.round(
                volumeLatencyCurrent?.find(
                  (vLV) => vLV.metric.device === volume.status.deviceName,
                )?.value[1] * 100,
              ) + 'ms'
            : intl.translate('unknown'),
        errorReason: volume?.status?.conditions[0]?.reason,
      };
    });
  },
);
