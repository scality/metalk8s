//@flow
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { UseQueryOptions } from 'react-query';
import styled from 'styled-components';
import DashboardMetrics from '../components/DashboardMetrics';
import { padding } from '@scality/core-ui/dist/style/theme';
import { Dropdown } from '@scality/core-ui';

import {
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
  LAST_ONE_HOUR,
  queryTimeSpansCodes,
} from '../constants';

import { useURLQuery } from '../services/utils';

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
      return props.theme.backgroundLevel2;
    }};
    color: ${(props) => props.theme.textPrimary};
    padding: 2px ${padding.smaller};
    .sc-vegachart svg {
      background-color: inherit !important;
    }
  }
  .health {
    grid-area: health;
  }
  .inventory {
    grid-area: inventory;
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

export type DashboardChartProps = {
  metricsTimeSpan: string,
  xAxis: Object,
  perNodeColor: Object,
  graphWidth: number,
  graphHeight: number,
  lineConfig: Object,
  perNodeTooltip: Object,
  reactQueryOptions: UseQueryOptions,
};

const DashboardPage = (props: {}) => {
  const history = useHistory();
  const query = useURLQuery();
  const queryTimeSpan = query.get('from');
  const [metricsTimeSpan, setMetricsTimeSpan] = useState(
    LAST_TWENTY_FOUR_HOURS,
  );

  // Sync url timespan to local timespan
  useEffect(() => {
    if (queryTimeSpan) {
      let formatted = queryTimeSpansCodes.find(
        (item) => item.label === queryTimeSpan,
      );
      if (formatted && formatted.value) setMetricsTimeSpan(formatted.value);
    }
  }, [queryTimeSpan]);

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
      setMetricsTimeSpan(option);
    },
    selected: metricsTimeSpan === option,
  }));

  const metricsTimeSpanDropdownItems = metricsTimeSpanItems.filter(
    (mTS) => mTS.label !== metricsTimeSpan,
  );

  return (
    <DashboardGrid>
      <div className="header">
        <Dropdown
          icon={<i className="fas fa-calendar-minus" />}
          items={metricsTimeSpanDropdownItems}
          text={metricsTimeSpan}
          size="small"
          data-cy="metrics_timespan_selection"
          variant="backgroundLevel1"
        />
      </div>
      <div className="health">Global Health</div>
      <div className="inventory">Inventory</div>
      <div className="network">Network</div>
      <div className="metrics">
        <DashboardMetrics />
      </div>
    </DashboardGrid>
  );
};
export default DashboardPage;
