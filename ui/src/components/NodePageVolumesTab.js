import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
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
import { fontSize } from '@scality/core-ui/dist/style/theme';
import { NodeTab } from './style/CommonLayoutStyle';
import { useVolumesWithAlerts } from '../hooks';

// Overriding overflow for the Tab since the table components has inner scroll
export const NodesVolumesTab = styled(NodeTab)`
  overflow: hidden;
`;

const TabContent = styled.div`
  height: 78vh;
  .sc-progressbarcontainer {
    font-size: ${fontSize.small};
  }
`;

const NodePageVolumesTab = (props) => {
  const { name } = useParams();
  const dispatch = useDispatch();

  const volumeListData = useVolumesWithAlerts();

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
    dispatch(fetchVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);
  useEffect(() => {
    dispatch(refreshAlertsAction());
    return () => dispatch(stopRefreshAlertsAction());
  }, [dispatch]);

  return (
    <NodesVolumesTab>
      <TabContent>
        <NodePageVolumesTable
          volumeListData={volumeListData}
          nodeName={name}
        ></NodePageVolumesTable>
      </TabContent>
    </NodesVolumesTab>
  );
};

export default NodePageVolumesTab;
