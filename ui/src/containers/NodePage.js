import React from 'react';
import { useSelector } from 'react-redux';
import { Breadcrumb } from '@scality/core-ui';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { useRefreshEffect } from '../services/utils';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
} from '../components/BreadcrumbStyle';
import NodePageContent from './NodePageContent';
import { PageContainer } from '../components/CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

const NodePage = (props) => {
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  const theme = useSelector((state) => state.config.theme);

  const nodes = useSelector((state) => state.app.nodes.list);

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
      <NodePageContent nodes={nodes}></NodePageContent>
    </PageContainer>
  );
};

export default NodePage;
