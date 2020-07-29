import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router';
import styled from 'styled-components';
import Loader from '../components/Loader';
import { Breadcrumb } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import VolumeListTable from './VolumeListTable';
import ActiveAlertsCard from '../components/ActiveAlertsCard';
import VolumeDetailCard from './VolumeDetailCard';
import PerformanceGraphCard from './PerformanceGraphCard';
import { fetchPodsAction } from '../ducks/app/pods';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import {
  makeGetNodeFromUrl,
  makeGetPodsFromUrl,
  makeGetVolumesFromUrl,
  useRefreshEffect,
  allSizeUnitsToBytes,
} from '../services/utils';
import { SPARSE_LOOP_DEVICE, RAW_BLOCK_DEVICE } from '../constants';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
  fetchPersistentVolumeClaimAction,
} from '../ducks/app/volumes';
import {
  refreshVolumeStatsAction,
  refreshAlertsAction,
  stopRefreshAlertsAction,
} from '../ducks/app/monitoring';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';
import {
  computeVolumeGlobalStatus,
  getVolumeListData,
} from '../services/NodeVolumesUtils';
import { intl } from '../translations/IntlGlobalProvider';

// should be extracted to the common style, need to change the position of other's breadcrumb
const PageContainer = styled.div`
  display: flex;
  box-sizing: border-box;
  height: 100%;
  flex-wrap: wrap;
  padding: ${padding.small};
`;

const VolumeContent = styled.div`
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

const VolumePage = (props) => {
  const match = useRouteMatch();
  const dispatch = useDispatch();

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(refreshVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);
  useEffect(() => {
    dispatch(refreshAlertsAction());
    return () => dispatch(stopRefreshAlertsAction());
  }, [dispatch]);

  const theme = useSelector((state) => state.config.theme);
  const pods = useSelector((state) => makeGetPodsFromUrl(state, props));
  const node = useSelector((state) => makeGetNodeFromUrl(state, props));
  const volumes = useSelector((state) => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector((state) => state.app.volumes.pVList);
  const alerts = useSelector((state) => state.app.monitoring.alert);

  const currentVolumeName = match.params.volumeName;

  const pV = pVList.find((pv) => pv.metadata.name === currentVolumeName);
  const volume = volumes.find(
    (volume) => volume.metadata.name === currentVolumeName,
  );

  const volumeStatus = computeVolumeGlobalStatus(
    volume?.metadata?.name,
    volume?.status,
  );

  // in order to get the used pod(s)
  const PVCName = pV?.spec?.claimRef?.name;
  const UsedPod = pods.find((pod) =>
    pod.volumes.find((volume) => volume.persistentVolumeClaim === PVCName),
  );

  // get the alert base on the current
  const alertlist = alerts?.list?.filter(
    (alert) => alert.labels.persistentvolumeclaim === PVCName,
  );

  const volumeListData = useSelector((state) =>
    getVolumeListData(state, props),
  );

  const currentVolume = volumeListData?.find(
    (vol) => vol.name === currentVolumeName,
  );

  return currentVolumeName && volume ? (
    <PageContainer>
      {/* There are two cases could be redirected to the Volume Page. */}
      <BreadcrumbContainer>
        {node.name !== undefined ? (
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <BreadcrumbLabel title={intl.translate('platform')}>
                {intl.translate('platform')}
              </BreadcrumbLabel>,
              <StyledLink to="/nodes">{intl.translate('nodes')}</StyledLink>,
              <StyledLink to={`/nodes/${node.name}`} title={node.name}>
                {node.name}
              </StyledLink>,
              <BreadcrumbLabel title={intl.translate('volumes')}>
                {intl.translate('volumes')}
              </BreadcrumbLabel>,
            ]}
          />
        ) : (
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <BreadcrumbLabel title={intl.translate('platform')}>
                {intl.translate('platform')}
              </BreadcrumbLabel>,
              <BreadcrumbLabel title={intl.translate('volumes')}>
                {intl.translate('volumes')}
              </BreadcrumbLabel>,
            ]}
          />
        )}
      </BreadcrumbContainer>
      <VolumeContent>
        <LeftSideVolumeList>
          <VolumeListTable
            volumeListData={volumeListData}
            nodeName={node?.name}
          ></VolumeListTable>
        </LeftSideVolumeList>
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
          ></VolumeDetailCard>
          <ActiveAlertsCard
            alertlist={alertlist}
            PVCName={PVCName}
          ></ActiveAlertsCard>
          <PerformanceGraphCard
            deviceName={volume?.status?.deviceName}
            PVCName={PVCName}
            volumeStorageCapacity={allSizeUnitsToBytes(
              pV?.spec?.capacity?.storage,
            )}
            // the volume condition compute base on the `status` and `bound/unbound`
            volumeCondition={currentVolume.status}
            // Hardcode the port number for prometheus metrics
            instance={node?.internalIP + `:9100`}
          ></PerformanceGraphCard>
        </RightSidePanel>
      </VolumeContent>
    </PageContainer>
  ) : (
    <Loader />
  );
};

export default VolumePage;
