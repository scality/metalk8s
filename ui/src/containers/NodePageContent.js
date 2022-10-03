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
  PageContentContainer,
  RightSidePanel,
} from '../components/style/CommonLayoutStyle';
import { usePrevious } from '../services/utils';
import { EmptyState } from '@scality/core-ui';

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(nodeTableData), defaultSelectNodeName]);

  return (
    <PageContentContainer>
      {!nodeTableData.length && isFirstLoadingDone ? (
        <EmptyState
          label={'Node'}
          link="/nodes/create"
          icon="Node-backend"
          history={history}
        />
      ) : (
        <Fragment>
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
          </RightSidePanel>
        </Fragment>
      )}
    </PageContentContainer>
  );
};

export default NodePageContent;
