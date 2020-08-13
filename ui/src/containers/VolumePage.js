import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { padding } from '@scality/core-ui/dist/style/theme';
import VolumeContent from './VolumePageContent';
import { fetchPodsAction } from '../ducks/app/pods';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { makeGetNodeFromUrl, useRefreshEffect } from '../services/utils';
import { LAST_TWENTY_FOUR_HOURS } from '../constants';
import { fetchNodesAction } from '../ducks/app/nodes';
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
  refreshCurrentVolumeStatsAction,
} from '../ducks/app/monitoring';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
} from '../components/BreadcrumbStyle';
import { getVolumeListData } from '../services/NodeVolumesUtils';
import { Breadcrumb } from '@scality/core-ui';
import { intl } from '../translations/IntlGlobalProvider';

// should be extracted to the common style, need to change the position of other's breadcrumb
const PageContainer = styled.div`
  display: flex;
  box-sizing: border-box;
  height: 100%;
  flex-wrap: wrap;
  padding: ${padding.small};
`;

// <VolumePage> component fetchs all the data used by volume page from redux store.
// the data for <VolumeMetricGraphCard>: get the default metrics time span `last 24 hours`, and the component itself can change the time span base on the dropdown selection.
// <VolumeContent> component extracts the current volume name from URL and sends volume specific data to sub components.
const VolumePage = (props) => {
  const dispatch = useDispatch();

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(fetchNodesAction());
    // fetch the last 24 hours data for metrics graph
    dispatch(refreshVolumeStatsAction(LAST_TWENTY_FOUR_HOURS));
    dispatch(refreshCurrentVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);
  useEffect(() => {
    dispatch(refreshAlertsAction());
    return () => dispatch(stopRefreshAlertsAction());
  }, [dispatch]);

  // get all the pods for all the nodes
  const theme = useSelector((state) => state.config.theme);
  const pods = useSelector((state) => state.app.pods.list);
  const node = useSelector((state) => makeGetNodeFromUrl(state, props));
  const nodes = useSelector((state) => state.app.nodes.list);
  // const volumes = useSelector((state) => makeGetVolumesFromUrl(state, props));
  const volumes = useSelector((state) => state.app.volumes.list);
  const pVList = useSelector((state) => state.app.volumes.pVList);
  const alerts = useSelector((state) => state.app.monitoring.alert);
  const volumeStats = useSelector((state) => state.app.monitoring.volumeStats);
  const volumeCurrentStats = useSelector(
    (state) => state.app.monitoring.volumeCurrentStats,
  );
  // get all the volumes maybe filter by node
  const volumeListData = useSelector((state) =>
    getVolumeListData(state, props),
  );

  return (
    <PageContainer>
      <BreadcrumbContainer>
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
      </BreadcrumbContainer>
      <VolumeContent
        volumes={volumes}
        volumeListData={volumeListData}
        nodes={nodes}
        node={node}
        pVList={pVList}
        pods={pods}
        alerts={alerts}
        volumeStats={volumeStats}
        volumeCurrentStats={volumeCurrentStats}
      ></VolumeContent>
    </PageContainer>
  );
};

export default VolumePage;
