import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import { useHistory, useLocation } from 'react-router';
import styled from 'styled-components';
import { Tabs } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { fetchPodsAction } from '../ducks/app/pods';
import { getPodsListData } from '../services/PodUtils';
import { useQuery, useRefreshEffect } from '../services/utils';
import {
  fetchNodeStatsAction,
  updateNodeStatsAction,
  refreshNodeStatsAction,
  stopRefreshNodeStatsAction,
} from '../ducks/app/monitoring';
import NodePageHealthTab from '../components/NodePageHealthTab';
import NodePageAlertsTab from '../components/NodePageAlertsTab';
import NodePageMetricsTab from './NodePageMetricsTab';
import NodePageVolumesTab from '../components/NodePageVolumesTab';
import NodePagePodsTab from '../components/NodePagePodsTab';
import {
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
  LAST_ONE_HOUR,
  QUERY_LAST_SEVEN_DAYS,
  QUERY_LAST_ONE_HOUR,
  QUERY_LAST_TWENTY_FOUR_HOURS,
} from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

const NodePageRSPContainer = styled.div`
  .sc-tabs {
    margin: ${padding.smaller} ${padding.small} 0 ${padding.smaller};
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
  } = props;
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();
  const nodeStats = useSelector(
    (state) => state.app.monitoring.nodeStats.metrics,
  );
  const theme = useSelector((state) => state.config.theme);

  // Initialize the `metricsTimeSpan` in redux base on the URL query.
  // Keep the selected timespan for metrics tab when switch the tabs
  const query = useQuery();
  const nodeMetricsTimeSpan = useSelector(
    (state) => state.app.monitoring.nodeStats.metricsTimeSpan,
  );

  let metricsTimeSpan;
  let queryTimespan = query.get('from');
  if (queryTimespan) {
    switch (queryTimespan) {
      case QUERY_LAST_SEVEN_DAYS:
        metricsTimeSpan = LAST_SEVEN_DAYS;
        break;
      case QUERY_LAST_ONE_HOUR:
        metricsTimeSpan = LAST_ONE_HOUR;
        break;
      default:
        metricsTimeSpan = LAST_TWENTY_FOUR_HOURS;
    }
  } else {
    metricsTimeSpan = nodeMetricsTimeSpan;
    switch (nodeMetricsTimeSpan) {
      case LAST_SEVEN_DAYS:
        queryTimespan = QUERY_LAST_SEVEN_DAYS;
        break;
      case LAST_ONE_HOUR:
        queryTimespan = QUERY_LAST_ONE_HOUR;
        break;
      default:
        queryTimespan = QUERY_LAST_TWENTY_FOUR_HOURS;
    }
  }

  // retrieve the podlist data
  const pods = useSelector((state) => state.app.pods.list);
  const podsListData = getPodsListData(selectedNodeName, pods);
  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(
      updateNodeStatsAction({
        metricsTimeSpan,
        instanceIP,
        controlPlaneInterface,
        workloadPlaneInterface,
      }),
    );
    dispatch(fetchNodeStatsAction());
  }, [
    metricsTimeSpan,
    instanceIP,
    controlPlaneInterface,
    workloadPlaneInterface,
    dispatch,
  ]);

  useRefreshEffect(refreshNodeStatsAction, stopRefreshNodeStatsAction);

  const isHealthTabActive = location.pathname.endsWith('/health');
  const isAlertsTabActive = location.pathname.endsWith('/alerts');
  const isMetricsTabActive = location.pathname.endsWith('/metrics');
  const isVolumesTabActive = location.pathname.endsWith('/volumes');
  const isPodsTabActive = location.pathname.endsWith('/pods');

  const items = [
    {
      selected: isHealthTabActive,
      title: 'Health',
      onClick: () => history.push(`/newNodes/${selectedNodeName}/health`),
    },
    {
      selected: isAlertsTabActive,
      title: intl.translate('alerts'),
      onClick: () => history.push(`/newNodes/${selectedNodeName}/alerts`),
    },
    {
      selected: isMetricsTabActive,
      title: 'Metrics',
      onClick: () => history.push(`/newNodes/${selectedNodeName}/metrics`),
    },
    {
      selected: isVolumesTabActive,
      title: intl.translate('volumes'),
      onClick: () => history.push(`/newNodes/${selectedNodeName}/volumes`),
    },
    {
      selected: isPodsTabActive,
      title: intl.translate('pods'),
      onClick: () => history.push(`/newNodes/${selectedNodeName}/pods`),
    },
  ];

  return (
    <NodePageRSPContainer>
      <Tabs items={items} activeTabColor={theme.brand.primaryDark1}>
        <Switch>
          <Route
            path={`/newNodes/${selectedNodeName}/health`}
            component={NodePageHealthTab}
          />
          <Route
            path={`/newNodes/${selectedNodeName}/alerts`}
            component={NodePageAlertsTab}
          />
          <Route
            path={`/newNodes/${selectedNodeName}/metrics`}
            render={() => (
              <NodePageMetricsTab
                nodeStats={nodeStats}
                instanceIP={instanceIP}
                controlPlaneInterface={controlPlaneInterface}
                workloadPlaneInterface={workloadPlaneInterface}
                selectedNodeName={selectedNodeName}
              />
            )}
          />
          <Route
            path={`/newNodes/${selectedNodeName}/volumes`}
            component={NodePageVolumesTab}
          />
          <Route
            path={`/newNodes/${selectedNodeName}/pods`}
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
