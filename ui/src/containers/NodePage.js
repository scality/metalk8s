import React from 'react';
import { useSelector } from 'react-redux';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { useRefreshEffect } from '../services/utils';
import NodePageContent from './NodePageContent';
import { PageContainer } from '../components/style/CommonLayoutStyle';
import { getNodeListData } from '../services/NodeUtils';
import { useAlerts } from './AlertProvider';
import { useTheme } from 'styled-components';

const NodePage = (props) => {
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  const {alerts} = useAlerts();
  const theme = useTheme();
  const nodeTableData = useSelector((state) => getNodeListData(alerts, theme)(state, props));
  const nodesLoading = useSelector((state) => state.app.nodes.isLoading);

  return (
    <PageContainer>
      <NodePageContent
        nodeTableData={nodeTableData}
        loading={nodesLoading}
      />
    </PageContainer>
  );
};

export default NodePage;
