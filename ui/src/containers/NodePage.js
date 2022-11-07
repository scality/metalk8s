import React from 'react';
import { useSelector } from 'react-redux';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { useRefreshEffect } from '../services/utils';
import NodePageContent from './NodePageContent';
import { getNodeListData } from '../services/NodeUtils';
import { useAlerts } from './AlertProvider';
import { useTheme } from 'styled-components';
import { useTypedSelector } from '../hooks';

const NodePage = (props) => {
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  const { alerts } = useAlerts();
  const theme = useTheme();
  const nodeTableData = useSelector(
    (state) => getNodeListData(alerts, theme)(state, props),
    (left, right) => {
      return JSON.stringify(left) === JSON.stringify(right);
    },
  );
  const nodesLoading = useTypedSelector((state) => state.app.nodes.isLoading);

  return (
    <>
      <NodePageContent nodeTableData={nodeTableData} loading={nodesLoading} />
    </>
  );
};

export default NodePage;
