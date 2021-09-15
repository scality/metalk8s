import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router';
import { Tabs } from '@scality/core-ui/dist/next';
import { fetchPodsAction } from '../ducks/app/pods';
import { getPodsListData } from '../services/PodUtils';
import { useURLQuery, useRefreshEffect } from '../services/utils';
import {
  updateNodeStatsFetchArgumentAction,
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
} from '../components/style/CommonLayoutStyle';
import {
  queryTimeSpansCodes,
  NODE_ALERTS_GROUP,
  PORT_NODE_EXPORTER,
} from '../constants';
import { useAlerts } from './AlertProvider';
import { useIntl } from 'react-intl';

// <NodePageRSP> fetches the data for all the tabs given the current selected Node
// handles the refresh for the metrics tab
const NodePageRSP = (props) => {
  const { nodeTableData } = props;
  const dispatch = useDispatch();
  const intl = useIntl();
  const { url } = useRouteMatch();
  const { name } = useParams();
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

  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);

  // Retrieve the podlist data
  const pods = useSelector((state) => state.app.pods.list);
  const podsListData = getPodsListData(name, pods);
  const nodes = useSelector((state) => state.app.nodes.list);
  const volumes = useSelector((state) => state.app.volumes.list);

  const nodesIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const instanceIP =
    nodes?.find((node) => node.name === name)?.internalIP ?? '';
  const controlPlaneInterface =
    nodesIPsInfo[name]?.controlPlane?.interface ?? '';
  const workloadPlaneInterface =
    nodesIPsInfo[name]?.workloadPlane?.interface ?? '';
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
  });

  const alertsNode = ((alertList && alertList.alerts) || []).filter(
    (alert) =>
      alert.labels.instance === `${instanceIP}:${PORT_NODE_EXPORTER}` ||
      alert.labels.node === name,
  );

  return name && currentNode ? (
    <Tabs>
      <Tabs.Tab
        path={`${url}/overview`}
        label={intl.formatMessage({ id: 'overview' })}
        data-cy="overview_tab_node_page"
      >
        <NodePageOverviewTab
          nodeName={name}
          pods={pods}
          nodeTableData={nodeTableData}
          volumes={volumes}
          nodes={nodes}
        />
      </Tabs.Tab>
      <Tabs.Tab
        path={`${url}/alerts`}
        label={intl.formatMessage({ id: 'alerts' })}
        textBadge={
          alertsNode && alertsNode.length ? (
            <TextBadge variant={'infoPrimary'}>{alertsNode.length}</TextBadge>
          ) : null
        }
        data-cy="alerts_tab_node_page"
      >
        <NodePageAlertsTab alertsNode={alertsNode} />
      </Tabs.Tab>
      <Tabs.Tab
        path={`${url}/metrics`}
        label={intl.formatMessage({ id: 'metrics' })}
        data-cy={'metrics_tab_node_page'}
      >
        <NodePageMetricsTab
          nodeName={name}
          instanceIP={instanceIP}
          controlPlaneInterface={controlPlaneInterface}
          workloadPlaneInterface={workloadPlaneInterface}
          nodesIPsInfo={nodesIPsInfo}
        />
      </Tabs.Tab>
      <Tabs.Tab
        data-cy="volumes_tab_node_page"
        path={`${url}/volumes`}
        label={intl.formatMessage({ id: 'volumes' })}
      >
        <NodePageVolumesTab nodeName={name} />
      </Tabs.Tab>
      <Tabs.Tab
        path={`${url}/pods`}
        data-cy="pods_tab_node_page"
        label={intl.formatMessage({ id: 'pods' })}
      >
        <NodePagePodsTab pods={podsListData} />
      </Tabs.Tab>
      <Tabs.Tab
        data-cy="partition_tab_node_page"
        path={`${url}/partitions`}
        label="Partitions"
      >
        <NodePagePartitionTabs instanceIP={instanceIP} />
      </Tabs.Tab>
      <Tabs.Tab
        data-cy="details_tab_node_page"
        label={intl.formatMessage({ id: 'details' })}
        path={`${url}/details`}
      >
        <NodePageDetailsTab />
      </Tabs.Tab>
    </Tabs>
  ) : (
    <NoInstanceSelected>
      {name
        ? `Node ${name} ${intl.formatMessage({ id: 'not_found' })}`
        : intl.formatMessage({ id: 'no_node_selected' })}
    </NoInstanceSelected>
  );
};

export default NodePageRSP;
