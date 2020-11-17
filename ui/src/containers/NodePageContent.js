import React, { useEffect, useState } from 'react';
import { Route, useRouteMatch, Switch, Redirect } from 'react-router-dom';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import {
  refreshAlertManagerAction,
  stopRefreshAlertManagerAction,
} from '../ducks/app/alerts';
import { useRefreshEffect } from '../services/utils';
import NodeListTable from '../components/NodeListTable';
import NodePageRSP from './NodePageRSP';
import {
  LeftSideInstanceList,
  PageContentContainer,
  RightSidePanel,
} from '../components/CommonLayoutStyle';

// <NodePageContent> get the current selected node and pass it to <NodeListTable> and <NodePageRSP>
const NodePageContent = (props) => {
  const { nodeTableData, alerts } = props;
  const { path } = useRouteMatch();
  const [defaultSelectNodeName, setDefaultSelectNodeName] = useState(null);

  useRefreshEffect(refreshAlertManagerAction, stopRefreshAlertManagerAction);
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  // Making sure the alerts have been retrieved (mandatory for health sorting) before selecting the first node
  useEffect(() => {
    if (alerts.list.length && !defaultSelectNodeName) {
      setDefaultSelectNodeName(nodeTableData[0]?.name?.name);
    }
  }, [alerts, nodeTableData, defaultSelectNodeName]);

  return (
    <PageContentContainer>
      <LeftSideInstanceList>
        <NodeListTable nodeTableData={nodeTableData} />
      </LeftSideInstanceList>
      <RightSidePanel>
        <Switch>
          {/* Auto select the first node in the list */}
          <Route
            exact
            path={`${path}`}
            render={() =>
              defaultSelectNodeName && (
                <Redirect to={`${path}/${defaultSelectNodeName}/overview`} />
              )
            }
          ></Route>
          <Route
            path={`${path}/:name`}
            render={() => {
              return <NodePageRSP nodeTableData={nodeTableData} />;
            }}
          ></Route>
        </Switch>
      </RightSidePanel>
    </PageContentContainer>
  );
};

export default NodePageContent;
