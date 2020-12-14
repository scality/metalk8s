import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Breadcrumb } from '@scality/core-ui';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { useRefreshEffect } from '../services/utils';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
} from '../components/BreadcrumbStyle';
import NodePageContent from './NodePageContent';
import { PageContainer } from '../components/CommonLayoutStyle';
import { fetchNodesIPsInterfaceAction } from '../ducks/app/nodes';
import { fetchAlertsAlertmanagerAction } from '../ducks/app/alerts';
import { getNodeListData } from '../services/NodeUtils';
import { intl } from '../translations/IntlGlobalProvider';

const NodePage = (props) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchNodesIPsInterfaceAction());
    dispatch(fetchAlertsAlertmanagerAction());
  }, [dispatch]);
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  const theme = useSelector((state) => state.config.theme);
  const nodeTableData = useSelector((state) => getNodeListData(state, props));
  const nodesLoading = useSelector((state) => state.app.nodes.isLoading);
  const alerts = useSelector((state) => state.app.alerts);

  return (
    <PageContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <BreadcrumbLabel title={intl.translate('platform')}>
              {intl.translate('platform')}
            </BreadcrumbLabel>,
            <BreadcrumbLabel title={intl.translate('nodes')}>
              {intl.translate('nodes')}
            </BreadcrumbLabel>,
          ]}
        />
      </BreadcrumbContainer>
      <NodePageContent
        nodeTableData={nodeTableData}
        alerts={alerts}
        loading={nodesLoading}
      />
    </PageContainer>
  );
};

export default NodePage;
