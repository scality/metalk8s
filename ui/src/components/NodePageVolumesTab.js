import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
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
import VolumeListTable from '../components/VolumeListTable';
import { getVolumeListData } from '../services/NodeVolumesUtils';
import { useRefreshEffect } from '../services/utils';
import { fontSize } from '@scality/core-ui/dist/style/theme';
import { TabContainer } from './CommonLayoutStyle';

const TabContent = styled.div`
  height: 70vh;
  .sc-progressbarcontainer {
    font-size: ${fontSize.small};
  }
`;

const NodePageVolumesTab = (props) => {
  const { selectedNodeName } = props;

  const dispatch = useDispatch();
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
  const history = useHistory();
  const volumeListData = useSelector((state) =>
    getVolumeListData(state, history),
  );
  return (
    <TabContainer>
      <TabContent>
        <VolumeListTable
          volumeListData={volumeListData}
          isNodeColumn={false}
          isSearchBar={false}
          nodeName={selectedNodeName}
        ></VolumeListTable>
      </TabContent>
    </TabContainer>
  );
};

export default NodePageVolumesTab;
