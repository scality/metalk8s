//@flow
import React from 'react';
import styled from 'styled-components';
import DashboardMetrics from '../components/DashboardMetrics';
import DashboardInventory from '../components/DashboardInventory';
import DashboardServices from '../components/DashboardServices';
import DashboardGlobalHealth from '../components/DashboardGlobalHealth';
import { padding, spacing } from '@scality/core-ui/dist/style/theme';
import { SyncedCursorCharts } from '@scality/core-ui/dist/components/vegachartv2/SyncedCursorCharts';
import TimespanSelector from './TimespanSelector';
import DashboardNetwork from '../components/DashboardNetwork';
import { AppContainer } from '@scality/core-ui';

const DashboardGrid = styled.div`
  display: grid;
  gap: ${AppContainer.sectionDistance};
  grid-template:
    'header header header header header' 2.5rem
    'health     health  health  health  health' 6.2rem
    'inventory  network network metrics metrics' auto
    / 1fr 1fr 1fr 1fr 1fr;
  overflow: hidden;
  flex: 1;
  > div {
    background-color: ${(props) => {
      return props.theme.backgroundLevel3;
    }};
    color: ${(props) => props.theme.textPrimary};
    padding: 2px ${spacing.sp4};
    .sc-vegachart svg {
      background-color: inherit !important;
    }
  }
  .health {
    grid-area: health;
    background-color: ${(props) => props.theme.backgroundLevel2};
    padding: 0;
  }
  .inventory {
    grid-area: inventory;
    padding: ${spacing.sp8} ${spacing.sp12};
  }
  .alerts {
    grid-area: alerts;
  }
  .services {
    grid-area: services;
  }
  .network {
    grid-area: network;
    display: flex;
  }
  .header {
    grid-area: header;
    display: flex;
    justify-content: flex-end;
    padding: ${padding.smaller} 0px;

    background-color: ${(props) => {
      return props.theme.backgroundLevel1;
    }};

    div {
      background-color: ${(props) => {
        return props.theme.backgroundLevel1;
      }};
    }
  }
  .metrics {
    grid-area: metrics;
    display: flex;
    flex-direction: column;

    // Needed to avoid dynamically sized charts to expand infinitely on refresh
    // more info here: https://www.w3.org/TR/css3-grid-layout/#min-size-auto
    min-width: 0;
    min-height: 0;
  }
`;

export const DashboardScrollableArea = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
`;

const DashboardPage = () => {
  return (
    <AppContainer.MainContent background="backgroundLevel1">
      <DashboardGrid>
        <div className="header">
          <AppContainer.ContextContainer>
            <TimespanSelector />
          </AppContainer.ContextContainer>
        </div>
        <SyncedCursorCharts>
          <DashboardScrollableArea className="health">
            <DashboardGlobalHealth />
          </DashboardScrollableArea>
          <DashboardScrollableArea className="inventory">
            <DashboardInventory />
            <DashboardServices />
          </DashboardScrollableArea>

          <DashboardScrollableArea className="network">
            <DashboardNetwork />
          </DashboardScrollableArea>

          <div className="metrics">
            <DashboardMetrics />
          </div>
        </SyncedCursorCharts>
      </DashboardGrid>
    </AppContainer.MainContent>
  );
};
export default DashboardPage;
