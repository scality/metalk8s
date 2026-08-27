import React from 'react';
import { AppContainer, Wrap, spacing } from '@scality/core-ui';

import styled from 'styled-components';
import DashboardMetrics from '../components/DashboardMetrics';
import DashboardInventory from '../components/DashboardInventory';
import DashboardServices from '../components/DashboardServices';
import DashboardGlobalHealth from '../components/DashboardGlobalHealth';
import TimespanSelector from './TimespanSelector';
import DashboardNetwork from '../components/DashboardNetwork';

/* Declares the query container the grid below resolves against. The dashboard is
   not inside a TwoPanelLayout, so nothing above it opts in. width: 100% is
   load-bearing: container-type: inline-size implies contain: inline-size, so a
   content-sized box would resolve to 0px wide -- the inline size has to come
   from the parent. */
const DashboardContainer = styled.div`
  container-type: inline-size;
  container-name: responsive;
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
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

  /* One row of five equal columns leaves the inventory ~150px and each chart
     group ~300px once the Guardian drawer narrows the content box, all of it
     silently clipped by the overflow: hidden above. Restack in two steps.

     The rows carry an explicit minimum because .network and .metrics are
     min-height: 0 flex columns holding self-sizing charts: on a plain auto row
     they collapse to nothing. And the grid has to start scrolling vertically
     once it is more than one row, or the extra rows are clipped instead. */
  @container responsive (max-width: 1100px) {
    grid-template:
      'inventory network network' minmax(20rem, auto)
      'metrics metrics metrics' minmax(22rem, auto)
      / minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    overflow: hidden auto;
  }

  @container responsive (max-width: 700px) {
    grid-template:
      'inventory' minmax(18rem, auto)
      'network' minmax(18rem, auto)
      'metrics' minmax(22rem, auto)
      / minmax(0, 1fr);
    overflow: hidden auto;
  }
`;
export const DashboardScrollableArea = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
`;

const SelectorPositioning = styled.div`
  .sc-dropdown {
    position: absolute;
    right: 1rem;
  }
`;

const DashboardPage = () => {
  return (
    <>
      <AppContainer.ContextContainer>
        <Wrap>
          <p></p>
          <SelectorPositioning>
            <TimespanSelector />
          </SelectorPositioning>
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
