//@flow
import React from 'react';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import DashboardMetrics from '../components/DashboardMetrics';
import DashboardInventory from '../components/DashboardInventory';
import DashboardServices from '../components/DashboardServices';
import DashboardGlobalHealth from '../components/DashboardGlobalHealth';
import { padding, spacing } from '@scality/core-ui/dist/style/theme';
import { Dropdown } from '@scality/core-ui';

import {
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
  LAST_ONE_HOUR,
  queryTimeSpansCodes,
} from '../constants';

import { useURLQuery } from '../services/utils';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import GlobalHealthBarComponent from '@scality/core-ui/dist/components/globalhealthbar/GlobalHealthBar.component';
import { useHistoryAlerts } from './AlertHistoryProvider';
import { getMetricsTimeValues } from '../services/prometheus/fetchMetrics';

const DashboardGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template:
    'header header header header header' 40px
    'health     health  health  health  health' 100px
    'inventory  network network metrics metrics' auto
    / 1fr 1fr 1fr 1fr 1fr;

  height: calc(100vh - 48px - 8px);
  margin: 0 8px 0 8px;

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

const DashboardPage = (props: {}) => {
  const history = useHistory();
  const query = useURLQuery();

  const [metricsTimeSpan] = useMetricsTimeSpan();

  const { currentTimeISO, startingTimeISO } = getMetricsTimeValues(
    metricsTimeSpan
  );

  const {alerts} = useHistoryAlerts({ alertname: ['PlatformAtRisk', 'PlatformDegraded'] });

  // Write the selected timespan in URL
  const writeUrlTimeSpan = (timespan: string) => {
    let formatted = queryTimeSpansCodes.find((item) => item.value === timespan);

    if (formatted) {
      query.set('from', formatted.label);
      history.push({ search: query.toString() });
    }
  };

  // Dropdown items
  const metricsTimeSpanItems = [
    LAST_SEVEN_DAYS,
    LAST_TWENTY_FOUR_HOURS,
    LAST_ONE_HOUR,
  ].map((option) => ({
    label: option,
    'data-cy': option,
    onClick: () => {
      writeUrlTimeSpan(option);
    },
    selected: queryTimeSpansCodes.find(timespan => timespan.duration === metricsTimeSpan)?.label === option,
  }));

  const metricsTimeSpanDropdownItems = metricsTimeSpanItems.filter(
    (mTS) => mTS.label !== queryTimeSpansCodes.find(timespan => timespan.duration === metricsTimeSpan)?.label,
  );

  return (
    <DashboardGrid>
      <div className="header">
        <Dropdown
          icon={<i className="fas fa-calendar-minus" />}
          items={metricsTimeSpanDropdownItems}
          text={queryTimeSpansCodes.find(timespan => timespan.duration === metricsTimeSpan)?.value}
          size="small"
          data-cy="metrics_timespan_selection"
          variant="backgroundLevel1"
        />
      </div>
      <div className="health">
        <DashboardGlobalHealth />
        Global Health
        <GlobalHealthBarComponent
          id={'platform_globalhealth'}
          alerts={alerts || []}
          start={startingTimeISO}
          end={currentTimeISO} />
      </div>
      <div className="inventory">
        <DashboardInventory />
        <DashboardServices />
      </div>
      <div className="network">Network</div>
      <div className="metrics">
        <DashboardMetrics />
      </div>
    </DashboardGrid>
  );
};
export default DashboardPage;
