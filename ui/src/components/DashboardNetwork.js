import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { spacing } from '@scality/core-ui/dist/style/theme';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import DashboardPlaneHealth from './DashboardPlaneHealth';
import DashboardBandwidthChart from './DashboardBandwidthChart';
import { DashboardScrollableArea } from '../containers/DashboardPage';
import { useNodes, useTypedSelector } from '../hooks';
import { NODES_LIMIT_QUANTILE } from '../constants';

export const NetworkContainer = styled.div`
  padding: ${spacing.sp2} ${spacing.sp4};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  width: 100%;
`;

export const PanelActions = styled.div`
  display: flex;
  padding: ${spacing.sp4};
  align-items: center;
  justify-content: space-between;
`;

const ChartContainer = styled.div`
  flex-grow: 1;
  width: 100%;
`;

const DashboardNetwork = () => {
  const intl = useIntl();
  const nodes = useNodes();
  const { flags } = useTypedSelector((state) => state.config.api);
  const isShowQuantileChart =
    (flags && flags.includes('force_quantile_chart')) ||
    nodes?.length > NODES_LIMIT_QUANTILE;
  return (
    <NetworkContainer>
      <PanelActions>
        <PageSubtitle>{intl.formatMessage({ id: 'network' })}</PageSubtitle>
      </PanelActions>
      <DashboardScrollableArea
        style={{ display: 'flex', flexDirection: 'column', flexGrow: '1' }}
      >
        <DashboardPlaneHealth />
        <ChartContainer>
          <DashboardBandwidthChart
            title="ControlPlane Bandwidth"
            plane="controlPlane"
            isShowQuantileChart={isShowQuantileChart}
          ></DashboardBandwidthChart>
        </ChartContainer>
        <ChartContainer>
          <DashboardBandwidthChart
            title="WorkloadPlane Bandwidth"
            plane="workloadPlane"
            isShowQuantileChart={isShowQuantileChart}
          ></DashboardBandwidthChart>
        </ChartContainer>
      </DashboardScrollableArea>
    </NetworkContainer>
  );
};

export default DashboardNetwork;
