import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import { useHistory, useLocation } from 'react-router';
import styled from 'styled-components';
import { Tabs } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { fetchNodeStatsAction } from '../ducks/app/monitoring';
import NodePageHealthTab from '../components/NodePageHealthTab';
import NodePageAlertsTab from '../components/NodePageAlertsTab';
import NodePageMetricsTab from '../components/NodePageMetricsTab';
import NodePageVolumesTab from '../components/NodePageVolumesTab';
import NodePagePodsTab from '../components/NodePagePodsTab';
import { intl } from '../translations/IntlGlobalProvider';

const NodePageRSPContainer = styled.div`
  .sc-tabs {
    margin: ${padding.smaller} ${padding.small} 0 ${padding.smaller};
  }

  .sc-tabs-item-content {
    padding: 0;
  }
`;

// <NodePageRSP> fetches the data for all the tabs given the current selected Node
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
  useEffect(() => {
    dispatch(
      fetchNodeStatsAction({
        instanceIP,
        controlPlaneInterface,
        workloadPlaneInterface,
      }),
    );
  }, [instanceIP, controlPlaneInterface, workloadPlaneInterface, dispatch]);

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
              <NodePageMetricsTab nodeStats={nodeStats}></NodePageMetricsTab>
            )}
          />
          <Route
            path={`/newNodes/${selectedNodeName}/volumes`}
            component={NodePageVolumesTab}
          />
          <Route
            path={`/newNodes/${selectedNodeName}/pods`}
            component={NodePagePodsTab}
          />
        </Switch>
      </Tabs>
    </NodePageRSPContainer>
  );
};

export default NodePageRSP;
