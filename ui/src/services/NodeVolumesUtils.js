import { createSelector } from 'reselect';
import {
  getNodeNameFromUrl,
  getVolumes,
  computeVolumeCondition,
  bytesToSize,
  compareHealth,
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
  PORT_NODE_EXPORTER,
} from '../constants';
import { intl } from '../translations/IntlGlobalProvider';
import type { Alert, Health } from './alertUtils';
import type { InstantVectorResult } from './prometheus/api';
import { V1PersistentVolume } from '@kubernetes/client-node/dist/gen/model/models';
import type { Metalk8sV1alpha1Volume } from '../services/k8s/Metalk8sVolumeClient.generated';
import { getHealthStatus, filterAlerts } from '../services/alertUtils';
export type VolumeStatus =
  | 'Unknown'
  | 'Ready'
  | 'Failed'
  | 'Pending'
  | 'Terminating';

export const isVolumeDeletable = (
  volumeStatus: VolumeStatus,
  volumeName: string,
  persistentVolumes: Array<V1PersistentVolume>,
): boolean => {
  switch (volumeStatus) {
    case STATUS_UNKNOWN:
    case STATUS_PENDING:
    case STATUS_TERMINATING:
      return false;
    case STATUS_FAILED:
    case STATUS_READY:
      if (persistentVolumes.length === 0) {
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
export const computeVolumeGlobalStatus = (
  name: string,
  status: $PropertyType<Metalk8sV1alpha1Volume, 'status'>,
): VolumeStatus => {
  if (status && status.conditions) {
    if (!Array.isArray(status.conditions)) {
      return STATUS_UNKNOWN;
    }
    const condition = status.conditions.find(
      (condition) => condition.type === 'Ready',
    );

    if (condition === undefined) {
      return STATUS_UNKNOWN;
    }

    const condStatus = condition.status;
    const condReason = condition.reason || '';

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
  }
  return STATUS_UNKNOWN;
};

// Extract the error code and message from the conditions.
//
// Arguments
//     status:  the volume Status field
//
// Returns
//     a tuple (error code, error message).
export const volumeGetError = (
  status?: $PropertyType<Metalk8sV1alpha1Volume, 'status'>,
): [string, string] => {
  if (!status || !Array.isArray(status.conditions)) {
    return ['', ''];
  }
  const condition = status.conditions.find(
    (condition) => condition.type === 'Ready',
  );

  return [condition?.reason ?? '', condition?.message ?? ''];
};

const getPVList = (state) => state?.app?.volumes?.pVList;
const getPVCList = (state) => state?.app?.volumes?.pVCList;
const getNodes = (state) => state?.app?.nodes?.list;

const getVolumeLatencyCurrent = (state) =>
  state?.app?.monitoring?.volumeCurrentStats?.metrics?.volumeLatencyCurrent;
const getVolumeUsedCurrent = (state) =>
  state?.app?.monitoring?.volumeCurrentStats?.metrics?.volumeUsedCurrent;
const getVolumeCapacityCurrent = (state) =>
  state?.app?.monitoring?.volumeCurrentStats?.metrics?.volumeCapacityCurrent;

export const getVolumeListData = createSelector(
  getNodeNameFromUrl,
  getVolumes,
  getPVList,
  getPVCList,
  getVolumeUsedCurrent,
  getNodes,
  getVolumeLatencyCurrent,
  getVolumeCapacityCurrent,
  (
    nodeFilter,
    volumes,
    pVList,
    pVCList,
    volumeUsedCurrentList,
    nodeList,
    volumeLatencyCurrent,
    volumeCapacityCurrentList,
  ) => {
    let nodeVolumes = volumes;
    if (nodeFilter) {
      nodeVolumes = volumes?.filter(
        (volume) => volume.spec.nodeName === nodeFilter,
      );
    }

    nodeVolumes = nodeVolumes?.map((volume) => {
      const volumePV = pVList?.find(
        (pV) => pV.metadata.name === volume.metadata.name,
      );
      // find the mapping PVC of this specific volume
      const volumePVC = pVCList?.find(
        (pVC) => pVC.spec.volumeName === volume.metadata.name,
      );
      const volumeComputedCondition = computeVolumeCondition(
        computeVolumeGlobalStatus(volume.metadata.name, volume?.status),
        volumePV?.status?.phase === STATUS_BOUND
          ? intl.translate('yes')
          : intl.translate('no'),
      );

      let volumeUsedCurrent = null;
      let volumeCapacityCurrent = null;
      // if volume is bounded
      if (volumePVC) {
        volumeUsedCurrent = volumeUsedCurrentList?.find(
          (volUsed) =>
            volUsed.metric.persistentvolumeclaim === volumePVC.metadata.name,
        );
        volumeCapacityCurrent = volumeCapacityCurrentList?.find(
          (volCap) =>
            volCap.metric.persistentvolumeclaim === volumePVC.metadata.name,
        );
      }

      const instanceIP = nodeList?.find(
        (node) => node.name === volume?.spec?.nodeName,
      )?.internalIP;

      const volumeCurrentLatency = volumeLatencyCurrent?.find(
        (vLV) =>
          vLV.metric.device === volume?.status?.deviceName &&
          vLV.metric.instance === `${instanceIP}:${PORT_NODE_EXPORTER}`,
      );

      return {
        name: volume?.metadata?.name,
        node: volume?.spec?.nodeName,
        usage:
          volumeUsedCurrent && volumeCapacityCurrent
            ? (
                (volumeUsedCurrent?.value[1] / volumeCapacityCurrent.value[1]) *
                100
              ).toFixed(2)
            : undefined,
        status: volumeComputedCondition,
        bound:
          volumePV?.status?.phase === STATUS_BOUND
            ? intl.translate('yes')
            : intl.translate('no'),
        storageCapacity: volumePV?.spec?.capacity?.storage,
        storageClass: volume?.spec?.storageClassName,
        usageRawData: volumeUsedCurrent?.value[1]
          ? bytesToSize(volumeUsedCurrent?.value[1])
          : 0,
        latency:
          // for latency we need to query the volumeLatecyCurrent based on both `instance` and `deviceName`
          volumeCurrentLatency
            ? Math.round(volumeCurrentLatency?.value[1])
            : undefined,
        errorReason: volume?.status?.conditions[0]?.reason,
      };
    });

    // Initial data sorting
    // Following sorts should be handled by react-table directly in the component
    return nodeVolumes.sort((a, b) => compareHealth(b.health, a.health));
  },
);

export const formatVolumeCreationData = (newVolumes) => {
  const {
    multiVolumeCreation,
    volumes,
    node,
    labels,
    type,
    size,
    storageClass,
  } = newVolumes;
  if (multiVolumeCreation) {
    // multi-volume creation mode
    return (
      volumes?.map((volume) => {
        volume.node = node;
        volume.labels = labels;
        volume.type = type;
        volume.size = size;
        volume.storageClass = storageClass;
        return volume;
      }) ?? []
    );
  } else {
    // single volume creation
    return [newVolumes];
  }
};

/**
 * This function formats the name base on the index
 * @param {string} name - The name the default volume name
 * @param {number} index  - The number of index
 *
 * @example
 * const name = 'volume-test'
 *
 * const formatedVolumeName = formatBatchName(name, 1)
 */
export const formatBatchName = (name: string, index: number): string => {
  if (index >= 1) {
    if (index <= 9) {
      return `${name}0${index}`;
    } else if (index >= 10) return `${name}${index}`;
  }
  return '';
};

type SystemDevice = {
  partitionPath: string,
  health: Health,
  size: string,
  usage: string,
  device: string,
};

export const getNodePartitionsTableData = (
  usages: $PropertyType<InstantVectorResult, 'result'>,
  sizes: $PropertyType<InstantVectorResult, 'result'>,
  alerts: Alert[],
): SystemDevice[] => {
  const partitions = usages.map((usage) => {
    const mountpoint = usage.metric.mountpoint;
    const alertsNodeFS = filterAlerts(alerts, {
      mountpoint: mountpoint,
    });
    const health = getHealthStatus(alertsNodeFS);
    const size = getPartitionSize(mountpoint, sizes);
    return {
      partitionPath: mountpoint,
      health,
      size,
      device: usage.metric.device,
      usage: parseFloat(usage.value[1]).toFixed(0),
    };
  });

  return partitions;
};

const getPartitionSize = (
  partitionPath: string,
  sizes: $PropertyType<InstantVectorResult, 'result'>,
): string => {
  const partition = sizes.find(
    (size) => size.metric.mountpoint === partitionPath,
  );

  if (partition) {
    return bytesToSize(partition.value[1]);
  } else return '';
};
