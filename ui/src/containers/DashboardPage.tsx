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
  /* One scroll owner for the whole dashboard. The grid and the cards inside it
     used to scroll as well, which stacked up to three nested scrollbars for a
     single list once the layout restacked. */
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

  /* One row of five equal columns leaves the inventory ~150px and each chart
     group ~300px once the Guardian drawer narrows the content box, all of it
     silently clipped by the overflow: hidden above. Restack in two steps.

     The first step keeps the inventory as a full-height left column and moves
     the metrics under the network, since the inventory reads as a sidebar
     rather than a peer of the two chart groups. Only the second step stacks
     all three.

     The rows carry an explicit minimum because .network and .metrics are
     min-height: 0 flex columns holding self-sizing charts: on a plain auto row
     they collapse to nothing. Each step also releases the grid from the
     wrapper's height so the wrapper is the only thing that scrolls. */
  @container responsive (max-width: 1100px) {
    grid-template:
      'inventory network' minmax(20rem, auto)
      'inventory metrics' minmax(22rem, auto)
      / minmax(0, 1fr) minmax(0, 2fr);
    overflow: visible;
    align-self: start;
  }

  @container responsive (max-width: 700px) {
    grid-template:
      'inventory' minmax(18rem, auto)
      'network' minmax(18rem, auto)
      'metrics' minmax(22rem, auto)
      / minmax(0, 1fr);
    overflow: visible;
    align-self: start;
  }
`;
export const DashboardScrollableArea = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  /* Both axes, because overflow-y: visible computes back to auto whenever the
     other axis is not visible - which would leave the inner scrollbar in place. */
  @container responsive (max-width: 1100px) {
    overflow: visible;
  }
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
