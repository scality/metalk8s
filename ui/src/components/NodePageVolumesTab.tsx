import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
  fetchPersistentVolumeClaimAction,
} from '../ducks/app/volumes';
import {
  refreshAlertsAction,
  stopRefreshAlertsAction,
  refreshCurrentVolumeStatsAction,
  stopRefreshCurrentVolumeStatsAction,
  fetchVolumeStatsAction,
} from '../ducks/app/monitoring';
import NodePageVolumesTable from '../components/NodePageVolumesTable';
import { useRefreshEffect } from '../services/utils';
import { useVolumesWithAlerts } from '../hooks';

const NodePageVolumesTab = (props) => {
  const { nodeName } = props;
  const dispatch = useDispatch();
  const volumeListData = useVolumesWithAlerts(nodeName);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshCurrentVolumeStatsAction,
    stopRefreshCurrentVolumeStatsAction,
  );
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useEffect(() => {
    // @ts-expect-error - FIXME when you are working on it
    dispatch(fetchVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);
  useEffect(
    // @ts-expect-error - FIXME when you are working on it
    () => {
      dispatch(refreshAlertsAction());
      return () => dispatch(stopRefreshAlertsAction());
    },
    [dispatch],
  );
  return (
    <NodePageVolumesTable
      // @ts-expect-error - FIXME when you are working on it
      volumeListData={volumeListData}
      nodeName={nodeName}
    ></NodePageVolumesTable>
  );
};

export default NodePageVolumesTab;
