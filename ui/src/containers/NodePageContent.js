import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { useRefreshEffect } from '../services/utils';
import NodeListTable from '../components/NodeListTable';
import NodePageRSP from './NodePageRSP';
import {
  LeftSideInstanceList,
  NoInstanceSelectedContainer,
  NoInstanceSelected,
  PageContentContainer,
} from '../components/CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

// <NodePageContent> get the current selected node and pass it to <NodeListTable> and <NodePageRSP>
const NodePageContent = (props) => {
  const { nodeTableData } = props;

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  const nodes = useSelector((state) => state.app.nodes.list);
  const nodesIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);

  const history = useHistory();
  const selectedNodeName =
    history?.location?.pathname?.split('/')?.slice(2)[0] || '';
  const instanceIP =
    nodes?.find((node) => node.name === selectedNodeName)?.internalIP ?? '';

  const controlPlaneInterface =
    nodesIPsInfo[selectedNodeName]?.controlPlane?.interface;
  const workloadPlaneInterface =
    nodesIPsInfo[selectedNodeName]?.workloadPlane?.interface;
  return (
    <PageContentContainer>
      <LeftSideInstanceList>
        <NodeListTable
          nodeTableData={nodeTableData}
          selectedNodeName={selectedNodeName}
        />
      </LeftSideInstanceList>
      {selectedNodeName ? (
        <NodePageRSP
          selectedNodeName={selectedNodeName}
          instanceIP={instanceIP}
          controlPlaneInterface={controlPlaneInterface}
          workloadPlaneInterface={workloadPlaneInterface}
          nodeTableData={nodeTableData}
        />
      ) : (
        <NoInstanceSelectedContainer>
          <NoInstanceSelected>
            {intl.translate('no_node_selected')}
          </NoInstanceSelected>
        </NoInstanceSelectedContainer>
      )}
    </PageContentContainer>
  );
};

export default NodePageContent;
