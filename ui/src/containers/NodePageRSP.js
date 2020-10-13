import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import styled from 'styled-components';
import { Tabs } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { fetchPodsAction } from '../ducks/app/pods';
import { getPodsListData } from '../services/PodUtils';
import { useQuery, useRefreshEffect } from '../services/utils';
import {
  updateNodeStatsFetchArgumentAction,
  refreshNodeStatsAction,
  stopRefreshNodeStatsAction,
} from '../ducks/app/monitoring';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
} from '../ducks/app/volumes';
import NodePageOverviewTab from '../components/NodePageOverviewTab';
import NodePageAlertsTab from '../components/NodePageAlertsTab';
import NodePageMetricsTab from './NodePageMetricsTab';
import NodePageVolumesTab from '../components/NodePageVolumesTab';
import NodePagePodsTab from '../components/NodePagePodsTab';
import { queryTimeSpansCodes } from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

const NodePageRSPContainer = styled.div`
  flex-direction: column;
  width: 51%;
  padding: 0 ${padding.small} ${padding.small} ${padding.small};
  .sc-tabs {
    margin-top: 0;
  }
  .sc-tabs-item-content {
    padding: 0;
    overflow-y: auto;
  }
`;

// <NodePageRSP> fetches the data for all the tabs given the current selected Node
// handles the refresh for the metrics tab
const NodePageRSP = (props) => {
  const {
    selectedNodeName,
    instanceIP,
    controlPlaneInterface,
    workloadPlaneInterface,
    nodeTableData,
  } = props;

  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();
  const { path } = useRouteMatch();
  // Initialize the `metricsTimeSpan` in saga state base on the URL query.
  // In order to keep the selected timespan for metrics tab when switch between the tabs.
  const query = useQuery();
  const nodeMetricsTimeSpan = useSelector(
    (state) => state.app.monitoring.nodeStats.metricsTimeSpan,
  );

  let metricsTimeSpan;
  const queryTimespan = query.get('from');

  if (queryTimespan) {
    // If timespan query specified in query string
    metricsTimeSpan = queryTimeSpansCodes?.find(
      (timespan) => timespan.label === queryTimespan,
    )?.value;
  } else {
    metricsTimeSpan = nodeMetricsTimeSpan;
  }

  useEffect(() => {
    dispatch(
      updateNodeStatsFetchArgumentAction({
        metricsTimeSpan,
        instanceIP,
        controlPlaneInterface,
        workloadPlaneInterface,
      }),
    );
    dispatch(fetchPodsAction());
  }, [
    metricsTimeSpan,
    instanceIP,
    controlPlaneInterface,
    workloadPlaneInterface,
    dispatch,
  ]);

  useRefreshEffect(refreshNodeStatsAction, stopRefreshNodeStatsAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);

  // retrieve the podlist data
  const pods = useSelector((state) => state.app.pods.list);
  const podsListData = getPodsListData(selectedNodeName, pods);
  const nodes = useSelector((state) => state.app.nodes.list);
  const volumes = useSelector((state) => state.app.volumes.list);
  const nodeStats = useSelector(
    (state) => state.app.monitoring.nodeStats.metrics,
  );

  const isHealthTabActive = location.pathname.endsWith('/overview');
  const isAlertsTabActive = location.pathname.endsWith('/alerts');
  const isMetricsTabActive = location.pathname.endsWith('/metrics');
  const isVolumesTabActive = location.pathname.endsWith('/volumes');
  const isPodsTabActive = location.pathname.endsWith('/pods');

  const items = [
    {
      selected: isHealthTabActive,
      title: 'Overview',
      onClick: () => history.push(`${path}/${selectedNodeName}/overview`),
    },
    {
      selected: isAlertsTabActive,
      title: intl.translate('alerts'),
      onClick: () => history.push(`${path}/${selectedNodeName}/alerts`),
    },
    {
      selected: isMetricsTabActive,
      title: 'Metrics',
      onClick: () => history.push(`${path}/${selectedNodeName}/metrics`),
    },
    {
      selected: isVolumesTabActive,
      title: intl.translate('volumes'),
      onClick: () => history.push(`${path}/${selectedNodeName}/volumes`),
    },
    {
      selected: isPodsTabActive,
      title: intl.translate('pods'),
      onClick: () => history.push(`${path}/${selectedNodeName}/pods`),
    },
  ];

  return (
    <NodePageRSPContainer>
      <Tabs items={items}>
        <Switch>
          <Route
            path={`${path}/:name/overview`}
            render={() => (
              <NodePageOverviewTab
                nodeTableData={nodeTableData}
                nodes={nodes}
                volumes={volumes}
                pods={pods}
              />
            )}
          />
          <Route path={`${path}/:name/alerts`} component={NodePageAlertsTab} />
          <Route
            path={`${path}/:name/metrics`}
            render={() => <NodePageMetricsTab nodeStats={nodeStats} />}
          />
          <Route
            path={`${path}/:name/volumes`}
            component={NodePageVolumesTab}
          />
          <Route
            path={`${path}/:name/pods`}
            render={() => (
              <NodePagePodsTab pods={podsListData}></NodePagePodsTab>
            )}
          />
        </Switch>
      </Tabs>
    </NodePageRSPContainer>
  );
};

export default NodePageRSP;
