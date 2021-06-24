/* eslint-disable react-hooks/exhaustive-deps */
import React, { Fragment, useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import { Switch, Route } from 'react-router-dom';
import { Tabs, EmptyState } from '@scality/core-ui';
import VolumeListTable from '../components/VolumeListTable';
import VolumeOverviewTab from '../components/VolumeOverviewTab';
import VolumeAlertsTab from '../components/VolumeAlertsTab';
import VolumeMetricsTab from '../components/VolumeMetricsTab';
import VolumeDetailsTab from '../components/VolumeDetailsTab';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  LVM_LOGICAL_VOLUME,
  PORT_NODE_EXPORTER,
} from '../constants';
import { computeVolumeGlobalStatus } from '../services/NodeVolumesUtils';
import { useAlerts } from '../containers/AlertProvider';
import {
  LeftSideInstanceList,
  NoInstanceSelectedContainer,
  NoInstanceSelected,
  TextBadge,
  RightSidePanel,
  TabsItemsStyle,
} from '../components/style/CommonLayoutStyle';
import { useIntl } from 'react-intl';
import { usePrevious } from '../services/utils';

const VolumePageContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
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
    pVCList,
    pods,
    volumeStats,
    currentVolumeObject,
    loading,
  } = props;

  const history = useHistory();
  const location = useLocation();
  const match = useRouteMatch();
  const query = new URLSearchParams(location.search);
  const [isFirstLoadingDone, setIsFirstLoadingDone] = useState(false);
  const previousLoading = usePrevious(loading);
  const intl = useIntl();
  const theme = useTheme();
  const currentVolumeName = match.params.name;

  // If data has been retrieved and no volume is selected yet we select the first one
  useEffect(() => {
    if (volumeListData[0]?.name && pVCList.length && !currentVolumeName) {
      history.replace({
        pathname: `/volumes/${volumeListData[0]?.name}/overview`,
        search: query.toString(),
      });
    }
  }, [
    JSON.stringify(volumeListData),
    currentVolumeName,
    query.toString(),
    history,
    JSON.stringify(pVCList),
  ]);

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
  const PVCNamespace = pV?.spec?.claimRef?.namespace;

  // we need to make sure that `PVCName` is exist otherwise may return undefined `persistentVolumeClaim` pod
  const UsedPod =
    PVCName &&
    pods?.find((pod) =>
      pod.volumes.find((volume) => volume.persistentVolumeClaim === PVCName),
    );

  const alertsVolume = useAlerts({ persistentvolumeclaim: PVCName });
  const alertlist = alertsVolume && alertsVolume.alerts;

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
  const isOverviewPage = location.pathname.endsWith('/overview');
  const isMetricsPage = location.pathname.endsWith('/metrics');
  const isDetailsPage = location.pathname.endsWith('/details');

  const tabsItems = [
    {
      selected: isOverviewPage,
      title: intl.formatMessage({ id: 'overview' }),
      onClick: () =>
        history.push(
          `${match.url}/overview${query.toString() && `?${query.toString()}`}`,
        ),
      'data-cy': 'overview_tab_volume_page',
    },
    {
      selected: isAlertsPage,
      title: (
        <span>
          {intl.formatMessage({ id: 'alerts' })}
          {alertlist && alertlist.length ? (
            <TextBadge variant={'infoPrimary'}>{alertlist.length}</TextBadge>
          ) : null}
        </span>
      ),
      onClick: () =>
        history.push(
          `${match.url}/alerts${query.toString() && `?${query.toString()}`}`,
        ),
      'data-cy': 'alerts_tab_volume_page',
    },
    {
      selected: isMetricsPage,
      title: <span>{intl.formatMessage({ id: 'metrics' })}</span>,
      onClick: () =>
        history.push(
          `${match.url}/metrics${query.toString() && `?${query.toString()}`}`,
        ),
      'data-cy': 'metrics_tab_volume_page',
    },
    {
      selected: isDetailsPage,
      title: <span>{intl.formatMessage({ id: 'details' })}</span>,
      onClick: () =>
        history.push(
          `${match.url}/details${query.toString() && `?${query.toString()}`}`,
        ),
      'data-cy': 'details_tab_volume_page',
    },
  ];

  /*
   ** Used to determine if a first loading has happened
   ** This allow us to check if we need to display EmptyState or not
   */
  useEffect(() => {
    if (previousLoading && !loading && !isFirstLoadingDone)
      setIsFirstLoadingDone(true);
  }, [previousLoading, loading, isFirstLoadingDone]);

  return (
    <VolumePageContentContainer>
      {!volumeListData.length && isFirstLoadingDone ? (
        <EmptyState
          label={'Volume'}
          link="/volumes/createVolume"
          icon="fa-database"
          history={history}
        />
      ) : (
        <Fragment>
          <LeftSideInstanceList>
            <VolumeListTable
              volumeListData={volumeListData}
              nodeName={node?.name}
              volumeName={currentVolumeName}
              isSearchBar={true}
              isNodeColumn={true}
            ></VolumeListTable>
          </LeftSideInstanceList>

          {currentVolumeName && volume ? (
            <RightSidePanel>
              <TabsItemsStyle>
                <Tabs activeTabColor={theme.backgroundLevel4} items={tabsItems}>
                  <Switch>
                    <Route
                      path={`${match.url}/overview`}
                      render={() => (
                        <VolumeOverviewTab
                          name={currentVolumeName}
                          nodeName={volume?.spec?.nodeName}
                          storage={
                            pV?.spec?.capacity?.storage ??
                            intl.formatMessage({ id: 'unknown' })
                          }
                          status={
                            volumeStatus ??
                            intl.formatMessage({ id: 'unknown' })
                          }
                          storageClassName={volume?.spec?.storageClassName}
                          creationTimestamp={
                            volume?.metadata?.creationTimestamp
                          }
                          volumeType={
                            volume.spec &&
                            Object.prototype.hasOwnProperty.call(
                              volume.spec,
                              'rawBlockDevice',
                            )
                              ? RAW_BLOCK_DEVICE
                              : volume.spec &&
                                Object.prototype.hasOwnProperty.call(
                                  volume.spec,
                                  'lvmLogicalVolume',
                                )
                              ? LVM_LOGICAL_VOLUME
                              : SPARSE_LOOP_DEVICE
                          }
                          usedPodName={
                            UsedPod
                              ? UsedPod?.name
                              : intl.formatMessage({ id: 'not_used' })
                          }
                          devicePath={
                            volume?.spec?.rawBlockDevice?.devicePath ??
                            intl.formatMessage({ id: 'not_applicable' })
                          }
                          vgName={
                            volume?.spec?.lvmLogicalVolume?.vgName ??
                            intl.formatMessage({ id: 'not_applicable' })
                          }
                          volumeUsagePercentage={currentVolume?.usage}
                          volumeUsageBytes={currentVolume?.usageRawData ?? 0}
                          storageCapacity={
                            volumeListData?.find(
                              (vol) => vol.name === currentVolumeName,
                            ).storageCapacity
                          }
                          health={
                            volumeListData?.find(
                              (vol) => vol.name === currentVolumeName,
                            ).health
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
                    <Route
                      path={`${match.url}/metrics`}
                      render={() => (
                        <VolumeMetricsTab
                          volumeName={currentVolumeName}
                          volumeMetricGraphData={volumeMetricGraphData}
                          // the volume condition compute base on the `status` and `bound/unbound`
                          volumeCondition={currentVolume.status}
                          volumePVCName={PVCName}
                          volumeNamespace={PVCNamespace}
                        />
                      )}
                    />
                    <Route
                      path={`${match.url}/details`}
                      render={() => (
                        <VolumeDetailsTab
                          currentVolumeObject={currentVolumeObject}
                        />
                      )}
                    />
                  </Switch>
                </Tabs>
              </TabsItemsStyle>
            </RightSidePanel>
          ) : (
            <NoInstanceSelectedContainer>
              <NoInstanceSelected>
                {currentVolumeName
                  ? `Volume ${currentVolumeName} ${intl.formatMessage({
                      id: 'not_found',
                    })}`
                  : intl.formatMessage({ id: 'no_volume_selected' })}
              </NoInstanceSelected>
            </NoInstanceSelectedContainer>
          )}
        </Fragment>
      )}
    </VolumePageContentContainer>
  );
};

export default VolumePageContent;
