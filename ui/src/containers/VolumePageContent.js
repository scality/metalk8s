import React from 'react';
import styled from 'styled-components';
import Loader from '../components/Loader';
import { useQuery, allSizeUnitsToBytes } from '../services/utils';
import VolumeListTable from '../components/VolumeListTable';
import VolumeDetailCard from '../components/VolumeDetailCard';
import ActiveAlertsCard from '../components/VolumeActiveAlertsCard';
import MetricGraphCard from '../components/VolumeMetricGraphCard';
import { SPARSE_LOOP_DEVICE, RAW_BLOCK_DEVICE } from '../constants';
import { computeVolumeGlobalStatus } from '../services/NodeVolumesUtils';
import { intl } from '../translations/IntlGlobalProvider';

const VolumePageContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  background-color: ${(props) => props.theme.brand.primary};
`;

const LeftSideVolumeList = styled.div`
  flex-direction: column;
  min-height: 696px;
  width: 40%;
`;

const RightSidePanel = styled.div`
  flex-direction: column;
  width: 60%;
  /* Make it scrollable for the small laptop screen */
  overflow-y: scroll;
`;

// <VolumePageContent> component extracts volume name from URL and holds the volume-specific data.
// The three components in RightSidePanel (<VolumeDetailCard> / <ActiveAlertsCard> / <MetricGraphCard>) are dumb components,
// so that with the implementation of Tabs no re-render should happen during the switch.
const VolumePageContent = (props) => {
  const {
    volumes,
    node,
    volumeListData,
    pVList,
    pods,
    alerts,
    volumeStats,
  } = props;

  const query = useQuery();
  const currentVolumeName = query.get('volume');

  const volume = volumes?.find(
    (volume) => volume.metadata.name === currentVolumeName,
  );
  const currentVolume = volumeListData?.find(
    (vol) => vol.name === currentVolumeName,
  );

  const pV = pVList?.find((pv) => pv.metadata.name === currentVolumeName);
  const volumeStatus = computeVolumeGlobalStatus(
    volume?.metadata?.name,
    volume?.status,
  );
  // get the used pod(s)
  const PVCName = pV?.spec?.claimRef?.name;
  const UsedPod = pods?.find((pod) =>
    pod.volumes.find((volume) => volume.persistentVolumeClaim === PVCName),
  );

  // get the alert base on the current
  const alertlist = alerts?.list?.filter(
    (alert) => alert.labels.persistentvolumeclaim === PVCName,
  );

  // prepare the data for <PerformanceGraphCard>
  const deviceName = volume?.status?.deviceName;
  const instance = node?.internalIP + `:9100`;

  const queryStartingTime = volumeStats?.queryStartingTime;
  const volumeUsed = volumeStats?.volumeUsed?.filter(
    (vU) => vU.metric.persistentvolumeclaim === PVCName,
  );
  const volumeThroughputWrite = volumeStats?.volumeThroughputWrite?.filter(
    (vTW) =>
      vTW.metric.instance === instance && vTW.metric.device === deviceName,
  );
  const volumeThroughputRead = volumeStats?.volumeThroughputRead?.filter(
    (vTR) =>
      vTR.metric.instance === instance && vTR.metric.device === deviceName,
  );
  const volumeLatency = volumeStats?.volumeLatency?.filter(
    (vL) => vL.metric.instance === instance && vL.metric.device === deviceName,
  );
  const volumeIOPSRead = volumeStats?.volumeIOPSRead?.filter(
    (vIOPSR) =>
      vIOPSR.metric.instance === instance &&
      vIOPSR.metric.device === deviceName,
  );
  const volumeIOPSWrite = volumeStats?.volumeIOPSWrite?.filter(
    (vIOPSW) =>
      vIOPSW.metric.instance === instance &&
      vIOPSW.metric.device === deviceName,
  );
  const volumeMetricGraphData = {
    volumeUsed,
    volumeThroughputWrite,
    volumeThroughputRead,
    volumeLatency,
    volumeIOPSRead,
    volumeIOPSWrite,
    queryStartingTime,
  };

  return (
    <VolumePageContentContainer>
      <LeftSideVolumeList>
        <VolumeListTable
          volumeListData={volumeListData}
          nodeName={node?.name}
          volumeName={currentVolumeName}
        ></VolumeListTable>
      </LeftSideVolumeList>
      {currentVolumeName && volume ? (
        <RightSidePanel>
          <VolumeDetailCard
            name={currentVolumeName}
            nodeName={volume?.spec?.nodeName}
            storage={pV?.spec?.capacity?.storage ?? intl.translate('unknown')}
            status={volumeStatus ?? intl.translate('unknown')}
            storageClassName={volume?.spec?.storageClassName}
            creationTimestamp={volume?.metadata?.creationTimestamp}
            volumeType={
              volume?.spec?.rawBlockDevice
                ? RAW_BLOCK_DEVICE
                : SPARSE_LOOP_DEVICE
            }
            usedPodName={UsedPod?.name}
            devicePath={
              volume?.spec?.rawBlockDevice?.devicePath ??
              intl.translate('not_applicable')
            }
            volumeUsagePercentage={currentVolume?.usage}
            volumeUsageBytes={currentVolume?.usageRawData ?? 0}
            storageCapacity={
              volumeListData?.find((vol) => vol.name === currentVolumeName)
                .storageCapacity
            }
            health={
              volumeListData?.find((vol) => vol.name === currentVolumeName)
                .health
            }
            condition={currentVolume.status}
            // the delete button inside the volume detail card should know that which volume is the first one
            volumeListData={volumeListData}
            pVList={pVList}
          ></VolumeDetailCard>
          <ActiveAlertsCard
            alertlist={alertlist}
            PVCName={PVCName}
          ></ActiveAlertsCard>
          <MetricGraphCard
            volumeMetricGraphData={volumeMetricGraphData}
            volumeStorageCapacity={allSizeUnitsToBytes(
              pV?.spec?.capacity?.storage,
            )}
            // the volume condition compute base on the `status` and `bound/unbound`
            volumeCondition={currentVolume.status}
            // Hardcode the port number for prometheus metrics
          ></MetricGraphCard>
        </RightSidePanel>
      ) : (
        <Loader />
      )}
    </VolumePageContentContainer>
  );
};

export default VolumePageContent;
