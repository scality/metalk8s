/* eslint-disable react-hooks/exhaustive-deps */
import React, { Fragment, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import { NoResult } from '@scality/core-ui/dist/components/tablev2/Tablestyle';
import { EmptyState, TextBadge } from '@scality/core-ui';
import VolumeListTable from '../components/VolumeListTable';
import VolumeOverviewTab from '../components/VolumeOverviewTab';
import AlertsTab from '../components/AlertsTab';
import VolumeMetricsTab from '../components/VolumeMetricsTab';
import VolumeDetailsTab from '../components/VolumeDetailsTab';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  LVM_LOGICAL_VOLUME,
} from '../constants';
import { computeVolumeGlobalStatus } from '../services/NodeVolumesUtils';
import { useAlerts } from './AlertProvider';
import {
  LeftSideInstanceList,
  NoInstanceSelectedContainer,
  NoInstanceSelected,
  RightSidePanel,
} from '../components/style/CommonLayoutStyle';
import { useIntl } from 'react-intl';
import { usePrevious } from '../services/utils';
import { Tabs } from '@scality/core-ui/dist/next';

const VolumePageContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
`;

// <VolumePageContent> component extracts volume name from URL and holds the volume-specific data.
// The three components in RightSidePanel (<VolumeOverviewTab> / <AlertsTab> / <MetricGraphCard>) are dumb components,
// so that with the implementation of Tabs no re-render should happen during the switch.
const VolumePageContent = (props) => {
  const {
    volumes,
    nodes,
    volumeListData,
    pVList,
    pVCList,
    pods,
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
  const criticalAlerts = alertlist.filter(
    (alert) => alert.severity === 'critical',
  );
  // prepare the data for <PerformanceGraphCard>
  const deviceName = volume?.status?.deviceName;

  const instanceIp = nodes.find(
    (node) => node.name === volume?.spec?.nodeName,
  )?.internalIP;

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
              volumeName={currentVolumeName}
            ></VolumeListTable>
          </LeftSideInstanceList>

          {currentVolumeName && volume ? (
            <RightSidePanel>
              <Tabs>
                <Tabs.Tab
                  path={`${match.url}/overview`}
                  label={intl.formatMessage({ id: 'overview' })}
                  data-cy="overview_tab_volume_page"
                >
                  <VolumeOverviewTab
                    name={currentVolumeName}
                    nodeName={volume?.spec?.nodeName}
                    status={
                      volumeStatus ?? intl.formatMessage({ id: 'unknown' })
                    }
                    storageClassName={volume?.spec?.storageClassName}
                    creationTimestamp={volume?.metadata?.creationTimestamp}
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
                      )?.storageCapacity
                    }
                    health={
                      volumeListData?.find(
                        (vol) => vol.name === currentVolumeName,
                      )?.health
                    }
                    condition={currentVolume?.status}
                    // the delete button inside the volume detail card should know that which volume is the first one
                    volumeListData={volumeListData}
                    pVList={pVList}
                    alertlist={alertlist}
                  />
                </Tabs.Tab>
                <Tabs.Tab
                  path={`${match.url}/alerts`}
                  label={intl.formatMessage({ id: 'alerts' })}
                  textBadge={
                    alertlist && alertlist.length ? (
                      <TextBadge
                        variant={
                          criticalAlerts.length > 0
                            ? 'statusCritical'
                            : 'statusWarning'
                        }
                        text={alertlist.length}
                      />
                    ) : null
                  }
                  data-cy="alerts_tab_volume_page"
                >
                  <AlertsTab
                    alerts={alertlist}
                    children={(Rows) => {
                      if (!PVCName) {
                        return (
                          <NoResult>
                            {intl.formatMessage({ id: 'volume_is_not_bound' })}
                          </NoResult>
                        );
                      } else if (PVCName && alertlist?.length === 0) {
                        return (
                          <NoResult>
                            {intl.formatMessage({ id: 'no_active_alerts' })}
                          </NoResult>
                        );
                      }
                      return <>{Rows}</>;
                    }}
                  />
                </Tabs.Tab>
                <Tabs.Tab
                  path={`${match.url}/metrics`}
                  label={intl.formatMessage({ id: 'metrics' })}
                  data-cy="metrics_tab_volume_page"
                >
                  <VolumeMetricsTab
                    volumeName={currentVolumeName}
                    deviceName={deviceName}
                    instanceIp={instanceIp}
                    // the volume condition compute base on the `status` and `bound/unbound`
                    volumeCondition={currentVolume?.status}
                    volumePVCName={PVCName}
                    volumeNamespace={PVCNamespace}
                  />
                </Tabs.Tab>
                <Tabs.Tab
                  label={intl.formatMessage({ id: 'details' })}
                  path={`${match.url}/details`}
                  data-cy="details_tab_volume_page"
                >
                  <VolumeDetailsTab currentVolumeObject={currentVolumeObject} />
                </Tabs.Tab>
              </Tabs>
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
