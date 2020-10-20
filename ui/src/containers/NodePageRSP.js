import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch, Route, useParams } from 'react-router-dom';
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
import { TextBadge } from '../components/CommonLayoutStyle';
import {
  queryTimeSpansCodes,
  NODE_ALERTS_GROUP,
  PORT_NODE_EXPORTER,
} from '../constants';
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
    dispatch,
    instanceIP,
    controlPlaneInterface,
    workloadPlaneInterface,
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

  const items = [
    {
      selected: isHealthTabActive,
      title: 'Overview',
      onClick: () => history.push(`${url}/overview`),
    },
    {
      selected: isAlertsTabActive,
      title: (
        <span>
          {intl.translate('alerts')}
          <TextBadge>{alertsNode?.length}</TextBadge>
        </span>
      ),
      onClick: () => history.push(`${url}/alerts`),
    },
    {
      selected: isMetricsTabActive,
      title: 'Metrics',
      onClick: () => history.push(`${url}/metrics`),
    },
    {
      selected: isVolumesTabActive,
      title: intl.translate('volumes'),
      onClick: () => history.push(`${url}/volumes`),
    },
    {
      selected: isPodsTabActive,
      title: intl.translate('pods'),
      onClick: () => history.push(`${url}/pods`),
    },
  ];

  return (
    <NodePageRSPContainer>
      <Tabs items={items}>
        <Switch>
          <Route
            path={`${path}/overview`}
            render={() => (
              <NodePageOverviewTab
                nodeTableData={nodeTableData}
                nodes={nodes}
                volumes={volumes}
                pods={pods}
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
                controlPlaneInterface={controlPlaneInterface}
                workloadPlaneInterface={workloadPlaneInterface}
                selectedNodeName={name}
              />
            )}
          />
          <Route path={`${path}/volumes`} component={NodePageVolumesTab} />
          <Route
            path={`${path}/pods`}
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
