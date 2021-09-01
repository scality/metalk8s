import React from 'react';
import styled from 'styled-components';
import { spacing } from '@scality/core-ui/dist/style/theme';
import { PageSubtitle } from './style/CommonLayoutStyle';
import { useIntl } from 'react-intl';
import DashboardNetworkControlPlane from './DashboardNetworkControlPlane';
import DashboardNetworkWorkloadPlane from './DashboardNetworkWorkloadPlane';
import type { UseQueryOptions } from 'react-query';
import { REFRESH_METRICS_GRAPH } from '../constants';

const NetworkContainer = styled.div`
  padding: 0px ${spacing.sp2};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const NetworkChartsContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const reactQueryOptions: UseQueryOptions = {
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchInterval: REFRESH_METRICS_GRAPH,
  refetchIntervalInBackground: true,
};

const DashboardNetwork = () => {
  const intl = useIntl();

  return (
    <NetworkContainer>
      <PageSubtitle aria-label="network">
        {intl.formatMessage({ id: 'network' })}
      </PageSubtitle>
      <NetworkChartsContainer>
        <DashboardNetworkControlPlane reactQueryOptions={reactQueryOptions} />
        <DashboardNetworkWorkloadPlane reactQueryOptions={reactQueryOptions} />
      </NetworkChartsContainer>
    </NetworkContainer>
  );
};

export default DashboardNetwork;
