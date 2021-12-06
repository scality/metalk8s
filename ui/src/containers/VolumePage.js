import React, { useEffect } from 'react';
import { useRouteMatch } from 'react-router';
import { useDispatch } from 'react-redux';

import VolumeContent from './VolumePageContent';
import { fetchPodsAction } from '../ducks/app/pods';
import { makeGetNodeFromUrl } from '../services/utils';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  useRefreshVolume,
  useFetchCurrentVolumeObject,
  useGetPersistentVolumes,
} from '../ducks/app/volumes.hooks';
import { useFetchCurrentVolumeStats } from '../ducks/app/monitoring.hooks';
import { fetchPersistentVolumeClaimAction } from '../ducks/app/volumes';
import { fetchVolumeStatsAction } from '../ducks/app/monitoring';
import { PageContainer } from '../components/style/CommonLayoutStyle';
import { useRefreshNodes } from '../ducks/app/nodes.hook';
import { useTypedSelector, useVolumesWithAlerts } from '../hooks';

// <VolumePage> component fetchs all the data used by volume page from redux store.
// the data for <VolumeMetricGraphCard>: get the default metrics time span `last 24 hours`, and the component itself can change the time span base on the dropdown selection.
// <VolumeContent> component extracts the current volume name from URL and sends volume specific data to sub components.
const VolumePage = (props) => {
  const dispatch = useDispatch();
  const match = useRouteMatch();
  const currentVolumeName = match.params.name;

  useFetchCurrentVolumeObject(currentVolumeName);

  useRefreshNodes();

  useGetPersistentVolumes();
  useFetchCurrentVolumeStats();
  useRefreshVolume();

  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(fetchNodesAction());
    dispatch(fetchVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);

  // get all the pods for all the nodes
  const pods = useTypedSelector((state) => state.app.pods.list);
  const node = useTypedSelector((state) => makeGetNodeFromUrl(state, props));
  const nodes = useTypedSelector((state) => state.app.nodes.list);
  const volumes = useTypedSelector((state) => state.app.volumes.list);
  const volumesLoading = useTypedSelector(
    (state) => state.app.volumes.isLoading,
  );
  const currentVolumeObject = useTypedSelector(
    (state) => state.app.volumes.currentVolumeObject,
  );

  const pVList = useTypedSelector((state) => state.app.volumes.pVList);

  /*
   ** The PVCs list is used to check when the alerts will be mapped to the corresponding volumes
   ** in order to auto select the volume when all the data are there.
   */
  const pVCList = useTypedSelector((state) => state?.app?.volumes?.pVCList);

  const volumeStats = useTypedSelector(
    (state) => state.app.monitoring.volumeStats.metrics,
  );
  // get all the volumes maybe filter by node
  const volumeListData = useVolumesWithAlerts();

  return (
    <PageContainer>
      <VolumeContent
        volumes={volumes}
        volumeListData={volumeListData}
        nodes={nodes}
        node={node}
        pVList={pVList}
        pVCList={pVCList}
        pods={pods}
        volumeStats={volumeStats}
        currentVolumeObject={currentVolumeObject}
        loading={volumesLoading}
      ></VolumeContent>
    </PageContainer>
  );
};

export default VolumePage;
