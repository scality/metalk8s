import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import NodePageVolumesTable from '../components/NodePageVolumesTable';
import {
  fetchVolumeStatsAction,
  refreshAlertsAction,
  refreshCurrentVolumeStatsAction,
  stopRefreshAlertsAction,
  stopRefreshCurrentVolumeStatsAction,
} from '../ducks/app/monitoring';
import {
  fetchPersistentVolumeClaimAction,
  refreshPersistentVolumesAction,
  refreshVolumesAction,
  stopRefreshPersistentVolumesAction,
  stopRefreshVolumesAction,
} from '../ducks/app/volumes';
import { useVolumesWithAlerts } from '../hooks';
import { useRefreshEffect } from '../services/utils';

const NodePageVolumesTab = (props) => {
  const { nodeName } = props;
  const dispatch = useDispatch();
  const volumeListData = useVolumesWithAlerts(nodeName);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(refreshCurrentVolumeStatsAction, stopRefreshCurrentVolumeStatsAction);
  useRefreshEffect(refreshPersistentVolumesAction, stopRefreshPersistentVolumesAction);
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
