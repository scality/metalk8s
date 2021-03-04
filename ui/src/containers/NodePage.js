import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { useRefreshEffect } from '../services/utils';
import NodePageContent from './NodePageContent';
import { PageContainer } from '../components/style/CommonLayoutStyle';
import { fetchAlertsAlertmanagerAction } from '../ducks/app/alerts';
import { getNodeListData } from '../services/NodeUtils';

const NodePage = (props) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchAlertsAlertmanagerAction());
  }, [dispatch]);
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  const nodeTableData = useSelector((state) => getNodeListData(state, props));
  const nodesLoading = useSelector((state) => state.app.nodes.isLoading);
  const alerts = useSelector((state) => state.app.alerts);

  return (
    <PageContainer>
      <NodePageContent
        nodeTableData={nodeTableData}
        alerts={alerts}
        loading={nodesLoading}
      />
    </PageContainer>
  );
};

export default NodePage;
