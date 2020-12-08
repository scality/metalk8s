import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import styled from 'styled-components';
import { Tabs } from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { fetchPodsAction } from '../ducks/app/pods';
import { getPodsListData } from '../services/PodUtils';
import { useQuery, useRefreshEffect } from '../services/utils';
import {
  updateNodeStatsFetchArgumentAction,
  refreshNodeStatsAction,
  stopRefreshNodeStatsAction,
  fetchNodeUNameInfoAction,
} from '../ducks/app/monitoring';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
} from '../ducks/app/volumes';
import { readNodeAction } from '../ducks/app/nodes';
import NodePageOverviewTab from '../components/NodePageOverviewTab';
import NodePageAlertsTab from '../components/NodePageAlertsTab';
import NodePageMetricsTab from './NodePageMetricsTab';
import NodePageVolumesTab from '../components/NodePageVolumesTab';
import NodePagePodsTab from '../components/NodePagePodsTab';
import NodePageDetailsTab from '../components/NodeDetailsTab';
import { TextBadge, NoInstanceSelected } from '../components/CommonLayoutStyle';
import {
  queryTimeSpansCodes,
  NODE_ALERTS_GROUP,
  PORT_NODE_EXPORTER,
} from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

const NodePageRSPContainer = styled.div`
  .sc-tabs {
    margin: 0;
  }
  .sc-tabs-bar {
    height: 40px;
  }
  .sc-tabs-item {
    margin-right: ${padding.smaller};
    background-color: ${(props) => props.theme.brand.border};
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    height: 40px;

    .sc-tabs-item-title {
      height: 40px;
      font-size: ${fontSize.base};
      padding: ${padding.small}
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }
  }
  .sc-tabs-item-content {
    padding: 0;
  }
`;

// <NodePageRSP> fetches the data for all the tabs given the current selected Node
// handles the refresh for the metrics tab
const NodePageRSP = (props) => {
  const { nodeTableData } = props;
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();

  const { path, url } = useRouteMatch();
  const { name } = useParams();

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

  useRefreshEffect(refreshNodeStatsAction, stopRefreshNodeStatsAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);

  // Retrieve the podlist data
  const pods = useSelector((state) => state.app.pods.list);
  const podsListData = getPodsListData(name, pods);
  const nodes = useSelector((state) => state.app.nodes.list);
  const volumes = useSelector((state) => state.app.volumes.list);
  const nodeStats = useSelector(
    (state) => state.app.monitoring.nodeStats.metrics,
  );
  const nodesIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const instanceIP =
    nodes?.find((node) => node.name === name)?.internalIP ?? '';
  const controlPlaneInterface = nodesIPsInfo[name]?.controlPlane?.interface;
  const workloadPlaneInterface = nodesIPsInfo[name]?.workloadPlane?.interface;
  const currentNode = nodeTableData?.find((node) => node.name.name === name);

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
    dispatch(readNodeAction({ name }));
    dispatch(fetchNodeUNameInfoAction());
  }, [
    metricsTimeSpan,
    dispatch,
    instanceIP,
    controlPlaneInterface,
    workloadPlaneInterface,
    name,
  ]);

  // Filter alerts for the specific node, base on the InstaceIP and Alert Name
  const alerts = useSelector((state) => state.app.alerts.list);
  const alertsNode =
    alerts?.filter(
      (alert) =>
        NODE_ALERTS_GROUP.includes(alert?.labels?.alertname) &&
        `${instanceIP}:${PORT_NODE_EXPORTER}` === alert?.labels?.instance,
    ) ?? [];

  const isHealthTabActive = location.pathname.endsWith('/overview');
  const isAlertsTabActive = location.pathname.endsWith('/alerts');
  const isMetricsTabActive = location.pathname.endsWith('/metrics');
  const isVolumesTabActive = location.pathname.endsWith('/volumes');
  const isPodsTabActive = location.pathname.endsWith('/pods');
  const isDetailsTabActive = location.pathname.endsWith('/details');

  const queryString = query?.toString();

  const items = [
    {
      selected: isHealthTabActive,
      title: 'Overview',
      onClick: () =>
        history.push(`${url}/overview${queryString && `?${queryString}`}`),
      'data-cy': 'overview_tab_node_page',
    },
    {
      selected: isAlertsTabActive,
      title: (
        <span>
          {intl.translate('alerts')}
          <TextBadge>{alertsNode?.length}</TextBadge>
        </span>
      ),
      onClick: () =>
        history.push(`${url}/alerts${queryString && `?${queryString}`}`),
      'data-cy': 'alerts_tab_node_page',
    },
    {
      selected: isMetricsTabActive,
      title: 'Metrics',
      onClick: () =>
        history.push(`${url}/metrics${queryString && `?${queryString}`}`),
      'data-cy': 'metrics_tab_node_page',
    },
    {
      selected: isVolumesTabActive,
      title: intl.translate('volumes'),
      onClick: () =>
        history.push(`${url}/volumes${queryString && `?${queryString}`}`),
      'data-cy': 'volumes_tab_node_page',
    },
    {
      selected: isPodsTabActive,
      title: intl.translate('pods'),
      onClick: () =>
        history.push(`${url}/pods${queryString && `?${queryString}`}`),
      'data-cy': 'pods_tab_node_page',
    },
    {
      selected: isDetailsTabActive,
      title: intl.translate('details'),
      onClick: () =>
        history.push(`${url}/details${queryString && `?${queryString}`}`),
      'data-cy': 'details_tab_node_page',
    },
  ];

  return name && currentNode ? (
    <NodePageRSPContainer>
      <Tabs items={items}>
        <Switch>
          <Route
            path={`${path}/overview`}
            render={() => (
              <NodePageOverviewTab
                pods={pods}
                nodeTableData={nodeTableData}
                volumes={volumes}
                nodes={nodes}
              />
            )}
          />
          <Route
            path={`${path}/alerts`}
            render={() => (
              <NodePageAlertsTab alertsNode={alertsNode}></NodePageAlertsTab>
            )}
          />
          <Route
            path={`${path}/metrics`}
            render={() => (
              <NodePageMetricsTab
                nodeStats={nodeStats}
                instanceIP={instanceIP}
              />
            )}
          />
          <Route
            path={`${path}/volumes`}
            render={() => <NodePageVolumesTab></NodePageVolumesTab>}
          />
          <Route
            path={`${path}/pods`}
            render={() => (
              <NodePagePodsTab pods={podsListData}></NodePagePodsTab>
            )}
          />
          <Route path={`${path}/details`} component={NodePageDetailsTab} />
        </Switch>
      </Tabs>
    </NodePageRSPContainer>
  ) : (
    <NoInstanceSelected>
      {name
        ? `Node ${name} ${intl.translate('not_found')}`
        : intl.translate('no_node_selected')}
    </NoInstanceSelected>
  );
};

export default NodePageRSP;
