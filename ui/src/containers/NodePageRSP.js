import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import { Tabs } from '@scality/core-ui';
import { useTheme } from 'styled-components';
import { fetchPodsAction } from '../ducks/app/pods';
import { getPodsListData } from '../services/PodUtils';
import { useURLQuery, useRefreshEffect } from '../services/utils';
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
import NodePagePartitionTabs from '../components/NodePagePartitionTab';
import NodePageDetailsTab from '../components/NodeDetailsTab';
import {
  TextBadge,
  NoInstanceSelected,
  TabsItemsStyle,
} from '../components/style/CommonLayoutStyle';
import {
  queryTimeSpansCodes,
  NODE_ALERTS_GROUP,
  PORT_NODE_EXPORTER,
} from '../constants';
import { useAlerts } from './AlertProvider';
import { useIntl } from 'react-intl';
import { useTypedSelector } from '../hooks';

// <NodePageRSP> fetches the data for all the tabs given the current selected Node
// handles the refresh for the metrics tab
const NodePageRSP = (props) => {
  const { nodeTableData } = props;
  const history = useHistory();
  const location = useLocation();
  const dispatch = useDispatch();
  const intl = useIntl();
  const { path, url } = useRouteMatch();
  const { name } = useParams();
  const theme = useTheme();
  // Initialize the `metricsTimeSpan` in saga state base on the URL query.
  // In order to keep the selected timespan for metrics tab when switch between the tabs.
  const query = useURLQuery();
  const nodeMetricsTimeSpan = useSelector(
    (state) => state.app.monitoring.nodeStats.metricsTimeSpan,
  );
  const nodeMetricsShowAvg = useSelector(
    (state) => state.app.monitoring.nodeStats.showAvg,
  );

  let metricsTimeSpan;
  const queryTimespan = query.get('from');
  const queryShowAvg = query.get('avg');

  if (queryTimespan) {
    // If timespan query specified in query string
    metricsTimeSpan = queryTimeSpansCodes?.find(
      (timespan) => timespan.label === queryTimespan,
    )?.value;
  } else {
    metricsTimeSpan = nodeMetricsTimeSpan;
  }

  const showAvg = queryShowAvg === 'true' ? true : nodeMetricsShowAvg;

  useRefreshEffect(refreshNodeStatsAction, stopRefreshNodeStatsAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);

  // Retrieve the podlist data
  const pods = useSelector((state) => state.app.pods.list);
  const podsListData = getPodsListData(name, pods);
  const nodes = useSelector((state) => state.app.nodes.list);
  const volumes = useSelector((state) => state.app.volumes.list);
  const nodeStats = useTypedSelector(
    (state) => state.app.monitoring.nodeStats.metrics,
  );
  const avgStats = useTypedSelector(
    (state) => state.app.monitoring.nodeStats.metricsAvg,
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
        showAvg,
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
    showAvg,
  ]);

  const alertList = useAlerts({
    alertname: NODE_ALERTS_GROUP,
    instance: `${instanceIP}:${PORT_NODE_EXPORTER}`,
  });

  const alertsNode = (alertList && alertList.alerts) || [];

  const isHealthTabActive = location.pathname.endsWith('/overview');
  const isAlertsTabActive = location.pathname.endsWith('/alerts');
  const isMetricsTabActive = location.pathname.endsWith('/metrics');
  const isVolumesTabActive = location.pathname.endsWith('/volumes');
  const isPodsTabActive = location.pathname.endsWith('/pods');
  const isSystemDevicesTabActive = location.pathname.endsWith('/partitions');
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
          {intl.formatMessage({ id: 'alerts' })}
          {alertsNode && alertsNode.length ? (
            <TextBadge variant={'infoPrimary'}>{alertsNode.length}</TextBadge>
          ) : null}
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
      title: intl.formatMessage({ id: 'volumes' }),
      onClick: () =>
        history.push(`${url}/volumes${queryString && `?${queryString}`}`),
      'data-cy': 'volumes_tab_node_page',
    },
    {
      selected: isPodsTabActive,
      title: intl.formatMessage({ id: 'pods' }),
      onClick: () =>
        history.push(`${url}/pods${queryString && `?${queryString}`}`),
      'data-cy': 'pods_tab_node_page',
    },
    {
      selected: isSystemDevicesTabActive,
      title: 'Partitions',
      onClick: () =>
        history.push(`${url}/partitions${queryString && `?${queryString}`}`),
      'data-cy': 'partition_tab_node_page',
    },
    {
      selected: isDetailsTabActive,
      title: intl.formatMessage({ id: 'details' }),
      onClick: () =>
        history.push(`${url}/details${queryString && `?${queryString}`}`),
      'data-cy': 'details_tab_node_page',
    },
  ];

  return name && currentNode ? (
    <TabsItemsStyle>
      <Tabs items={items} activeTabColor={theme.backgroundLevel4}>
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
                nodeName={name}
                nodeStats={nodeStats}
                avgStats={avgStats}
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
          <Route
            path={`${path}/partitions`}
            render={() => (
              <NodePagePartitionTabs
                instanceIP={instanceIP}
              ></NodePagePartitionTabs>
            )}
          />
          <Route
            path={`${path}/details`}
            render={() => <NodePageDetailsTab></NodePageDetailsTab>}
          />
        </Switch>
      </Tabs>
    </TabsItemsStyle>
  ) : (
    <NoInstanceSelected>
      {name
        ? `Node ${name} ${intl.formatMessage({ id: 'not_found' })}`
        : intl.formatMessage({ id: 'no_node_selected' })}
    </NoInstanceSelected>
  );
};

export default NodePageRSP;
