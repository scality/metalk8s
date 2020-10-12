// Temporarily disable the `no-unused-vars` lint until the refactoring is complete.
/* eslint-disable no-unused-vars */

import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import { Switch, Route } from 'react-router-dom';
import { Tabs } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import VolumeListTable from '../components/VolumeListTable';
import VolumeOverviewTab from '../components/VolumeOverviewTab';
import VolumeAlertsTab from '../components/VolumeAlertsTab';
import MetricGraphCard from '../components/VolumeMetricGraphCard';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  PORT_NODE_EXPORTER,
} from '../constants';
import { computeVolumeGlobalStatus } from '../services/NodeVolumesUtils';
import {
  LeftSideInstanceList,
  NoInstanceSelectedContainer,
  NoInstanceSelected,
  TextBadge
} from '../components/CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

const VolumePageContentContainer = styled.div`
display: flex;
flex-direction: row;
height: 100%;
width: 100%;

.sc-tabs {
  margin: 0 ${padding.small} 0 ${padding.smaller};
}

.sc-tabs-item-content {
  background-color: ${(props) => props.theme.brand.primary};
  padding: ${padding.small}
}
`;

const RightSidePanel = styled.div`
  flex-direction: column;
  width: 55%;
  overflow-y: scroll;
  margin: 0 ${padding.small} ${padding.small} 0;
`;

// <VolumePageContent> component extracts volume name from URL and holds the volume-specific data.
// The three components in RightSidePanel (<VolumeOverviewTab> / <VolumeAlertsTab> / <MetricGraphCard>) are dumb components,
// so that with the implementation of Tabs no re-render should happen during the switch.
const VolumePageContent = (props) => {
  const {
    volumes,
    nodes,
    node,
    volumeListData,
    pVList,
    pods,
    alerts,
    volumeStats,
  } = props;

  const history = useHistory();
  const location = useLocation();
  const match = useRouteMatch();
  const query = new URLSearchParams(location.search);

  const theme = useSelector((state) => state.config.theme);

  const currentVolumeName = match.params.name;
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

  // we need to make sure that `PVCName` is exist otherwise may return undefined `persistentVolumeClaim` pod
  const UsedPod =
    PVCName &&
    pods?.find((pod) =>
      pod.volumes.find((volume) => volume.persistentVolumeClaim === PVCName),
    );

  // get the alert
  const alertlist =
    PVCName &&
    alerts?.list?.filter(
      (alert) => alert.labels.persistentvolumeclaim === PVCName,
    );

  // prepare the data for <PerformanceGraphCard>
  const deviceName = volume?.status?.deviceName;
  let instance;

  if (!node.internalIP) {
    // find the node name of this volume
    const nodeName = volume?.spec?.nodeName;
    const currentNode = nodes.find((node) => node.name === nodeName);
    instance = `${currentNode?.internalIP}:${PORT_NODE_EXPORTER}`;
  } else {
    instance = `${node?.internalIP}:${PORT_NODE_EXPORTER}`;
  }

  const queryStartingTime = volumeStats?.queryStartingTime;
  const volumeUsage = volumeStats?.volumeUsage?.find(
    (vU) => vU.metric.persistentvolumeclaim === PVCName,
  )?.values;
  const volumeThroughputWrite = volumeStats?.volumeThroughputWrite?.find(
    (vTW) =>
      vTW.metric.instance === instance && vTW.metric.device === deviceName,
  )?.values;
  const volumeThroughputRead = volumeStats?.volumeThroughputRead?.find(
    (vTR) =>
      vTR.metric.instance === instance && vTR.metric.device === deviceName,
  )?.values;
  const volumeLatencyWrite = volumeStats?.volumeLatencyWrite?.find(
    (vL) => vL.metric.instance === instance && vL.metric.device === deviceName,
  )?.values;
  const volumeLatencyRead = volumeStats?.volumeLatencyRead?.find(
    (vL) => vL.metric.instance === instance && vL.metric.device === deviceName,
  )?.values;
  const volumeIOPSRead = volumeStats?.volumeIOPSRead?.find(
    (vIOPSR) =>
      vIOPSR.metric.instance === instance &&
      vIOPSR.metric.device === deviceName,
  )?.values;
  const volumeIOPSWrite = volumeStats?.volumeIOPSWrite?.find(
    (vIOPSW) =>
      vIOPSW.metric.instance === instance &&
      vIOPSW.metric.device === deviceName,
  )?.values;
  const volumeMetricGraphData = {
    volumeUsage,
    volumeThroughputWrite,
    volumeThroughputRead,
    volumeLatencyWrite,
    volumeLatencyRead,
    volumeIOPSRead,
    volumeIOPSWrite,
    queryStartingTime,
  };

  const isAlertsPage = location.pathname.endsWith('/alerts');
  const isOverviewPage = location.pathname.endsWith('/overview') || !isAlertsPage;
  const isMetricsPage = location.pathname.endsWith('/metrics');
  const isDetailsPage = location.pathname.endsWith('/details');

  const tabsItems = [
    {
      selected: isOverviewPage,
      title: intl.translate('overview'),
      onClick: () => history.push(`${match.url}/overview${query.toString() && `?${query.toString()}`}`),
    },
    {
      selected: isAlertsPage,
      title: (<span>{intl.translate('alerts')}&nbsp;&nbsp;<TextBadge>{alertlist?.length}</TextBadge></span>),
      onClick: () => history.push(`${match.url}/alerts${query.toString() && `?${query.toString()}`}`),
    },
  ];

  return (
    <VolumePageContentContainer>
      <LeftSideInstanceList>
        <VolumeListTable
          volumeListData={volumeListData}
          nodeName={node?.name}
          volumeName={currentVolumeName}
        ></VolumeListTable>
      </LeftSideInstanceList>

      {currentVolumeName && volume ? (
        <RightSidePanel>
          <Tabs activeColor={theme.brand.primary} items={tabsItems}>
            <Switch>
              <Route
                path={`${match.url}/overview`}
                render={() => (
                  <VolumeOverviewTab
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
                    usedPodName={UsedPod ? UsedPod?.name : intl.translate('not_used')}
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
                    alertlist={alertlist}
                  />
                )}
              />
              <Route
                path={`${match.url}/alerts`}
                render={() => (
                  <VolumeAlertsTab
                    alertlist={alertlist}
                    PVCName={PVCName}
                  />
                )}
              />
            </Switch>
          </Tabs>
        </RightSidePanel>
      ) : (
        <NoInstanceSelectedContainer>
          <NoInstanceSelected>
            {intl.translate('no_volume_selected')}
          </NoInstanceSelected>
        </NoInstanceSelectedContainer>
      )}
    </VolumePageContentContainer>
  );
};

export default VolumePageContent;
