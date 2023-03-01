/* eslint no-unused-vars: 0 */
import React, { useEffect, useState, Fragment } from 'react';
import {
  Route,
  useRouteMatch,
  Switch,
  Redirect,
  useHistory,
} from 'react-router-dom';
import NodeListTable from '../components/NodeListTable';
import NodePageRSP from './NodePageRSP';
import {
  LeftSideInstanceList,
  RightSidePanel,
} from '../components/style/CommonLayoutStyle';
import { usePrevious } from '../services/utils';
import { AppContainer, EmptyState, TwoPanelLayout } from '@scality/core-ui';

// <NodePageContent> get the current selected node and pass it to <NodeListTable> and <NodePageRSP>
const NodePageContent = (props) => {
  const { nodeTableData, loading } = props;
  const { path } = useRouteMatch();
  const [defaultSelectNodeName, setDefaultSelectNodeName] = useState(null);
  const [isFirstLoadingDone, setIsFirstLoadingDone] = useState(false);
  const previousLoading = usePrevious(loading);
  const history = useHistory();

  /*
   ** Used to determine if a first loading has happened
   ** This allow us to check if we need to display EmptyState or not
   */
  useEffect(() => {
    if (previousLoading && !loading && !isFirstLoadingDone)
      setIsFirstLoadingDone(true);
  }, [previousLoading, loading, isFirstLoadingDone]);
  useEffect(() => {
    if (!defaultSelectNodeName && nodeTableData[0]?.name?.name) {
      setDefaultSelectNodeName(nodeTableData[0]?.name?.name);
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(nodeTableData), defaultSelectNodeName]);

  if (!nodeTableData.length && isFirstLoadingDone) {
    return (
      <EmptyState
        label={'Node'}
        link="/nodes/create"
        icon="Node-backend"
        history={history}
      />
    );
  }

  return (
    <AppContainer.MainContent hasTopMargin>
      <TwoPanelLayout
        panelsRatio="50-50"
        leftPanel={{
          children: (
            <LeftSideInstanceList>
              <NodeListTable nodeTableData={nodeTableData} />
            </LeftSideInstanceList>
          ),
        }}
        rightPanel={{
          children: (
            <Switch>
              {/* Auto select the first node in the list */}
              <Route
                exact
                path={`${path}`}
                render={() =>
                  defaultSelectNodeName && (
                    <Redirect
                      to={`${path}/${defaultSelectNodeName}/overview`}
                    />
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
          ),
        }}
      />
    </AppContainer.MainContent>
  );
};

export default NodePageContent;