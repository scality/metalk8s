import React, { useEffect } from 'react';
import { useRouteMatch, useHistory } from 'react-router';
import { useSelector, useDispatch } from 'react-redux';
import VolumeContent from './VolumePageContent';
import { fetchPodsAction } from '../ducks/app/pods';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import {
  refreshAlertManagerAction,
  stopRefreshAlertManagerAction,
} from '../ducks/app/alerts';
import { makeGetNodeFromUrl, useRefreshEffect } from '../services/utils';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
  fetchPersistentVolumeClaimAction,
  fetchCurrentVolumeObjectAction,
} from '../ducks/app/volumes';
import {
  fetchVolumeStatsAction,
  fetchCurrentVolumeStatsAction,
  refreshCurrentVolumeStatsAction,
  stopRefreshCurrentVolumeStatsAction,
} from '../ducks/app/monitoring';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
} from '../components/BreadcrumbStyle';
import { getVolumeListData } from '../services/NodeVolumesUtils';
import { Breadcrumb } from '@scality/core-ui';
import { PageContainer } from '../components/CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';
import { useQuery } from '../services/utils';

// <VolumePage> component fetchs all the data used by volume page from redux store.
// the data for <VolumeMetricGraphCard>: get the default metrics time span `last 24 hours`, and the component itself can change the time span base on the dropdown selection.
// <VolumeContent> component extracts the current volume name from URL and sends volume specific data to sub components.
const VolumePage = (props) => {
  const dispatch = useDispatch();
  const match = useRouteMatch();
  const currentVolumeName = match.params.name;
  const query = useQuery();
  const history = useHistory();

  useEffect(() => {
    if (currentVolumeName)
      dispatch(fetchCurrentVolumeObjectAction(currentVolumeName));
  }, [dispatch, currentVolumeName]);

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useRefreshEffect(
    refreshCurrentVolumeStatsAction,
    stopRefreshCurrentVolumeStatsAction,
  );

  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(fetchNodesAction());
    dispatch(fetchVolumeStatsAction());
    dispatch(fetchCurrentVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);

  useRefreshEffect(refreshAlertManagerAction, stopRefreshAlertManagerAction);

  // get all the pods for all the nodes
  const theme = useSelector((state) => state.config.theme);
  const pods = useSelector((state) => state.app.pods.list);
  const node = useSelector((state) => makeGetNodeFromUrl(state, props));
  const nodes = useSelector((state) => state.app.nodes.list);
  const volumes = useSelector((state) => state.app.volumes.list);
  const volumesLoading = useSelector((state) => state.app.volumes.isLoading);
  const currentVolumeObject = useSelector(
    (state) => state.app.volumes.currentVolumeObject,
  );
  const pVList = useSelector((state) => state.app.volumes.pVList);

  /*
   ** The PVCs list is used to check when the alerts will be mapped to the corresponding volumes
   ** in order to auto select the volume when all the data are there.
   */
  const pVCList = useSelector((state) => state?.app?.volumes?.pVCList);
  const alerts = useSelector((state) => state.app.alerts);

  const volumeStats = useSelector(
    (state) => state.app.monitoring.volumeStats.metrics,
  );
  // get all the volumes maybe filter by node
  const volumeListData = useSelector((state) =>
    getVolumeListData(state, props),
  );

  // If data has been retrieved and no volume is selected yet we select the first one
  useEffect(() => {
    if (
      volumeListData[0]?.name &&
      alerts.list?.length &&
      pVCList.length &&
      !currentVolumeName
    ) {
      history.replace({
        pathname: `/volumes/${volumeListData[0]?.name}/overview`,
        search: query.toString(),
      });
    }
  }, [volumeListData, currentVolumeName, query, history, alerts.list, pVCList]);

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
        currentVolumeObject={currentVolumeObject}
        loading={volumesLoading}
      ></VolumeContent>
    </PageContainer>
  );
};

export default VolumePage;
