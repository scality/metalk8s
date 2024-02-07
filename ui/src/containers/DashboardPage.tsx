import { AppContainer } from '@scality/core-ui';
import { SyncedCursorCharts } from '@scality/core-ui/dist/components/vegachartv2/SyncedCursorCharts';
import { spacing } from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';
import DashboardGlobalHealth from '../components/DashboardGlobalHealth';
import DashboardInventory from '../components/DashboardInventory';
import DashboardMetrics from '../components/DashboardMetrics';
import DashboardNetwork from '../components/DashboardNetwork';
import DashboardServices from '../components/DashboardServices';
import TimespanSelector from './TimespanSelector';
const DashboardGrid = styled.div`
  display: grid;
  gap: ${AppContainer.sectionDistance};
  grid-template:
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

const SelectorPositioning = styled.div`
  .sc-dropdown {
    position: absolute;
    right: 1rem;
    top: 3rem;
  }
`;

const DashboardPage = () => {
  return (
    <>
      <AppContainer.ContextContainer>
        <div />
      </AppContainer.ContextContainer>
      <SelectorPositioning>
        <TimespanSelector />
      </SelectorPositioning>
      {/* @ts-expect-error - FIXME when you are working on it */}
      <SyncedCursorCharts>
        <AppContainer.OverallSummary>
          <DashboardGlobalHealth />
        </AppContainer.OverallSummary>
        <AppContainer.MainContent background="backgroundLevel1">
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
        </AppContainer.MainContent>
      </SyncedCursorCharts>
    </>
  );
};

export default DashboardPage;
