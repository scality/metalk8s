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
  /* Scroll owner for the one-row layout, where the grid is sized by its content.
     Once the grid restacks it is stretched to this box and each cell scrolls
     itself, so nothing reaches here - that is deliberate: the grid and the cards
     inside it used to scroll too, which stacked up to three nested scrollbars
     for a single list. */
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

     Both steps keep the grid stretched to the container and clipping, and every
     cell scrolls itself: the two chart rows split the available height evenly, so
     the page never grows a scrollbar of its own and neither panel can push the
     other off screen. Neither chart row carries a minimum - the grid clips, so a
     minimum the height cannot honour is not a floor, it is content cut off with
     no way to scroll to it. */
  @container responsive (max-width: 1100px) {
    grid-template:
      'inventory network' minmax(0, 1fr)
      'inventory metrics' minmax(0, 1fr)
      / minmax(0, 1fr) minmax(0, 2fr);
  }

  /* Fully restacked, the inventory keeps its content height and the two chart
     panels split what is left of it. */
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

/* Both controls act on the Network and the Metrics panels rather than on either
   one of them, so they live in the page's context bar. The dropdown used to be
   positioned absolutely against the viewport, which put it under the Guardian
   drawer as soon as the drawer opened. */
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
