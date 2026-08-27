/* eslint no-unused-vars: 0 */
import { AppContainer, EmptyState, TwoPanelLayout } from '@scality/core-ui';
import { useEffect, useState } from 'react';
import { Route, Routes, useResolvedPath } from 'react-router';
import NodeListTable from '../components/NodeListTable';
import { LeftSideInstanceList } from '../components/style/CommonLayoutStyle';
import { usePrevious } from '../services/utils';
import NodePageRSP from './NodePageRSP';
import { useBasenameRelativeNavigate } from '@scality/module-federation';

// <NodePageContent> get the current selected node and pass it to <NodeListTable> and <NodePageRSP>
const NodePageContent = (props) => {
  const { nodeTableData, loading } = props;
  const path = useResolvedPath('').pathname;
  const [isFirstLoadingDone, setIsFirstLoadingDone] = useState(false);
  const previousLoading = usePrevious(loading);
  const navigate = useBasenameRelativeNavigate();

  /*
   ** Used to determine if a first loading has happened
   ** This allow us to check if we need to display EmptyState or not
   */
  useEffect(() => {
    if (previousLoading && !loading && !isFirstLoadingDone) setIsFirstLoadingDone(true);
  }, [previousLoading, loading, isFirstLoadingDone]);
  useEffect(() => {
    if (nodeTableData.length > 0) {
      const firstNodeName = nodeTableData[0]?.name?.name;
      if (firstNodeName && !path.includes(firstNodeName) && path.endsWith('/nodes')) {
        navigate(`/nodes/${firstNodeName}/overview`, { replace: true });
      }
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(nodeTableData)]);

  if (!nodeTableData.length && isFirstLoadingDone) {
    return (
      <EmptyState
        listedResource={{
          singular: 'node',
          plural: 'nodes',
        }}
        link="/nodes/create"
        icon="Node-backend"
      />
    );
  }

  return (
    <AppContainer.MainContent hasTopMargin>
      <TwoPanelLayout
        panelsRatio="50-50"
        container="both"
        leftPanel={{
          children: (
            <LeftSideInstanceList>
              <NodeListTable nodeTableData={nodeTableData} />
            </LeftSideInstanceList>
          ),
        }}
        rightPanel={{
          children: (
            <Routes>
              <Route path=":name/*" element={<NodePageRSP nodeTableData={nodeTableData} />} />
            </Routes>
          ),
        }}
      />
    </AppContainer.MainContent>
  );
};

export default NodePageContent;
