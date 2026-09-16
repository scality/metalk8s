import React from 'react';
import { AppContainer, Wrap, spacing } from '@scality/core-ui';

import styled from 'styled-components';
import DashboardMetrics from '../components/DashboardMetrics';
import DashboardInventory from '../components/DashboardInventory';
import DashboardServices from '../components/DashboardServices';
import DashboardGlobalHealth from '../components/DashboardGlobalHealth';
import TimespanSelector from './TimespanSelector';
import DashboardNetwork from '../components/DashboardNetwork';
import AdvancedMetricsButton from '../components/AdvancedMetricsButton';

/* Its inline size has to come from the parent, and flex and width each ensure that:
   container-type implies contain: inline-size, so a content-sized box here resolves
   to 0px and no query in the grid below fires. */
const DashboardContainer = styled.div`
  container-type: inline-size;
  container-name: responsive;
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden auto;
`;

const DashboardGrid = styled.div`
  display: grid;
  gap: ${AppContainer.sectionDistance};
  grid-template:
    'inventory  network network metrics metrics' auto
    / 1fr 1fr 1fr 1fr 1fr;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  > div {
    background-color: ${(props) => {
      return props.theme.backgroundLevel3;
    }};
    color: ${(props) => props.theme.textPrimary};
    padding: 2px ${spacing.r4};
  }
  .inventory {
    grid-area: inventory;
    padding: ${spacing.r8} ${spacing.r12};
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
  .metrics {
    grid-area: metrics;
    display: flex;
    flex-direction: column;

    /* Needed to avoid dynamically sized charts to expand infinitely on refresh */
    /* more info here: https://www.w3.org/TR/css3-grid-layout/#min-size-auto */
    min-width: 0;
    min-height: 0;
  }

  /* Neither chart row gets a minimum height: the grid clips, so a minimum it cannot
     honour would cut content off with no scrollbar to reach it. */
  @container responsive (max-width: 1100px) {
    grid-template:
      'inventory network' minmax(0, 1fr)
      'inventory metrics' minmax(0, 1fr)
      / minmax(0, 1fr) minmax(0, 2fr);
  }

  @container responsive (max-width: 700px) {
    grid-template:
      'inventory' auto
      'network' minmax(0, 1fr)
      'metrics' minmax(0, 1fr)
      / minmax(0, 1fr);

    /* Not a scroll container here: a scroll container's min-content height is 0,
       so the grid would squeeze this row to nothing and scroll the cell instead of
       sizing it to its content. */
    .inventory {
      overflow: visible;
    }
  }
`;
export const DashboardScrollableArea = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
`;

const ContextActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.r8};
`;

const DashboardPage = () => {
  return (
    <>
      <AppContainer.ContextContainer>
        <Wrap>
          <p></p>
          <ContextActions>
            <TimespanSelector />
            <AdvancedMetricsButton />
          </ContextActions>
        </Wrap>
      </AppContainer.ContextContainer>

      <AppContainer.OverallSummary>
        <DashboardGlobalHealth />
      </AppContainer.OverallSummary>
      <AppContainer.MainContent background="backgroundLevel1">
        <DashboardContainer>
          <DashboardGrid>
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
          </DashboardGrid>
        </DashboardContainer>
      </AppContainer.MainContent>
    </>
  );
};

export default DashboardPage;
