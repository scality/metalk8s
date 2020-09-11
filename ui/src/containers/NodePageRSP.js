import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { useHistory, useLocation } from 'react-router';
import styled from 'styled-components';
import { Tabs } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
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

const NodePageRSP = (props) => {
  const history = useHistory();
  const location = useLocation();
  const { selectedNodeName } = props;

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
      <Tabs items={items}>
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
            component={NodePageMetricsTab}
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
