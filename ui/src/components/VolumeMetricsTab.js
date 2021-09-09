import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Dropdown, Button } from '@scality/core-ui';
import {
  fetchVolumeStatsAction,
  updateVolumeStatsAction,
} from '../ducks/app/monitoring';
import { fontSize, padding, spacing } from '@scality/core-ui/dist/style/theme';
import {
  VOLUME_CONDITION_LINK,
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
  LAST_ONE_HOUR,
  queryTimeSpansCodes,
  GRAFANA_DASHBOARDS,
} from '../constants';
import { useIntl } from 'react-intl';
import {
  VolumeTab,
  MetricsActionContainer,
  GraphWrapper,
} from './style/CommonLayoutStyle';
import {
  VolumeIOPSChart,
  VolumeLatencyChart,
  VolumeThroughputChart,
  VolumeUsageChart,
} from './VolumeCharts';
import { SyncedCursorCharts } from '@scality/core-ui/dist/components/vegachartv2/SyncedCursorCharts';

const MetricGraphCardContainer = styled.div`
  min-height: 270px;
`;

const GraphGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template:
    'usage latency' 1fr
    'throughput iops' 1fr
    / 1fr 1fr;
  .sc-vegachart svg {
    background-color: inherit !important;
  }
  .usage {
    grid-area: usage;
  }
  .latency {
    grid-area: latency;
  }
  .throughput {
    grid-area: throughput;
  }
  .iops {
    grid-area: iops;
  }
  padding-left: ${spacing.sp12};
  .sc-tabs-item-content {
    overflow: scroll;
  }
`;

// No data rendering should be extracted to an common style
const NoMetricsText = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const MetricsTab = (props) => {
  const {
    volumeCondition,
    deviceName,
    instanceIp,
    volumeName,
    volumeNamespace,
    volumePVCName,
  } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const intl = useIntl();
  const query = new URLSearchParams(history?.location?.search);
  const metricsTimeSpan = useSelector(
    (state) => state.app.monitoring.volumeStats.metricsTimeSpan,
  );
  const config = useSelector((state) => state.config);

  // write the selected timespan in URL
  const writeUrlTimeSpan = (timespan: string) => {
    let formatted = queryTimeSpansCodes.find((item) => item.value === timespan);

    if (formatted) {
      // preserves current query params
      query.set('from', formatted.label);
      history.push({ search: query.toString() });
    }
  };

  const handleUrlQuery = () => {
    const urlTimeSpan = queryTimeSpansCodes.find(
      (item) => item.label === query.get('from'),
    );

    // If a time span is specified we apply it
    // Else if a timespan has been set but is not in the URL yet (change of volume) we write it to the URL
    if (urlTimeSpan) {
      dispatch(updateVolumeStatsAction({ metricsTimeSpan: urlTimeSpan.value }));
      updateMetricsGraph();
    } else if (metricsTimeSpan !== LAST_TWENTY_FOUR_HOURS && !urlTimeSpan) {
      writeUrlTimeSpan(metricsTimeSpan);
    }
  };

  // handle timespan in url query
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(handleUrlQuery, [volumeName, query.get('from'), metricsTimeSpan]);

  const updateMetricsGraph = () => dispatch(fetchVolumeStatsAction());

  // the time span of metrics graph, by default is `Last 24 hours`
  const metricsTimeSpanItems = [
    {
      label: LAST_SEVEN_DAYS,
      onClick: () => {
        dispatch(updateVolumeStatsAction({ metricsTimeSpan: LAST_SEVEN_DAYS }));
        writeUrlTimeSpan(LAST_SEVEN_DAYS);
        updateMetricsGraph();
      },
      selected: metricsTimeSpan === LAST_SEVEN_DAYS,
      'data-cy': LAST_SEVEN_DAYS,
    },
    {
      label: LAST_TWENTY_FOUR_HOURS,
      onClick: () => {
        dispatch(
          updateVolumeStatsAction({ metricsTimeSpan: LAST_TWENTY_FOUR_HOURS }),
        );
        writeUrlTimeSpan(LAST_TWENTY_FOUR_HOURS);
        updateMetricsGraph();
      },
      selected: metricsTimeSpan === LAST_TWENTY_FOUR_HOURS,
      'data-cy': LAST_TWENTY_FOUR_HOURS,
    },
    {
      label: LAST_ONE_HOUR,
      onClick: () => {
        dispatch(updateVolumeStatsAction({ metricsTimeSpan: LAST_ONE_HOUR }));
        writeUrlTimeSpan(LAST_ONE_HOUR);
        updateMetricsGraph();
      },
      selected: metricsTimeSpan === LAST_ONE_HOUR,
      'data-cy': LAST_ONE_HOUR,
    },
  ];

  const metricsTimeSpanDropdownItems = metricsTimeSpanItems?.filter(
    (mTS) => mTS.label !== metricsTimeSpan,
  );

  return (
    <VolumeTab>
      <MetricGraphCardContainer>
        <MetricsActionContainer>
          {config.api?.url_grafana && volumeNamespace && volumePVCName && (
            <Button
              text={intl.formatMessage({ id: 'advanced_metrics' })}
              variant={'buttonSecondary'}
              onClick={() => {}}
              icon={<i className="fas fa-external-link-alt" />}
              size={'small'}
              href={`${config.api.url_grafana}/d/${GRAFANA_DASHBOARDS.volumes}?var-namespace=${volumeNamespace}&var-volume=${volumePVCName}`}
              target="_blank"
              rel="noopener noreferrer"
              data-cy="advanced_metrics_volume_detailed"
            />
          )}
          {volumeCondition === VOLUME_CONDITION_LINK && (
            <Dropdown
              items={metricsTimeSpanDropdownItems}
              text={metricsTimeSpan}
              size="small"
              data-cy="metrics_timespan_selection"
            />
          )}
        </MetricsActionContainer>
        {volumeCondition === VOLUME_CONDITION_LINK ? (
          <GraphGrid id="graph_container">
            <SyncedCursorCharts>
                <GraphWrapper className="usage">
                  <VolumeUsageChart
                    pvcName={volumePVCName}
                    namespace={volumeNamespace}
                    volumeName={volumeName}
                  />
                </GraphWrapper>
                <GraphWrapper className="latency">
                  <VolumeLatencyChart
                    instanceIp={instanceIp}
                    deviceName={deviceName}
                    volumeName={volumeName}
                  />
                </GraphWrapper>
                <GraphWrapper className="throughput">
                  <VolumeThroughputChart
                    instanceIp={instanceIp}
                    deviceName={deviceName}
                    volumeName={volumeName}
                  />
                </GraphWrapper>
                <GraphWrapper className="iops">
                  <VolumeIOPSChart
                    instanceIp={instanceIp}
                    deviceName={deviceName}
                    volumeName={volumeName}
                  />
                </GraphWrapper>
            </SyncedCursorCharts>
          </GraphGrid>
        ) : (
          <NoMetricsText>
            {intl.formatMessage({ id: 'volume_is_not_bound' })}
          </NoMetricsText>
        )}
      </MetricGraphCardContainer>
    </VolumeTab>
  );
};

export default MetricsTab;
