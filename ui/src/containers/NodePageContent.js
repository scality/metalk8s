import React from 'react';
import { Route, useRouteMatch, Switch } from 'react-router-dom';
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
  const { path } = useRouteMatch();

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  return (
    <PageContentContainer>
      <LeftSideInstanceList>
        <NodeListTable nodeTableData={nodeTableData} />
      </LeftSideInstanceList>
      <Switch>
        <Route
          path={`${path}/:name`}
          render={() => {
            return <NodePageRSP nodeTableData={nodeTableData} />;
          }}
        ></Route>
        <Route
          path={`${path}`}
          render={() => {
            return (
              <NoInstanceSelectedContainer>
                <NoInstanceSelected>
                  {intl.translate('no_node_selected')}
                </NoInstanceSelected>
              </NoInstanceSelectedContainer>
            );
          }}
        ></Route>
      </Switch>
    </PageContentContainer>
  );
};

export default NodePageContent;
