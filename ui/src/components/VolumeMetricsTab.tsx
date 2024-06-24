import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { Button } from '@scality/core-ui/dist/next';
import { fontSize } from '@scality/core-ui/dist/style/theme';
import { VOLUME_CONDITION_LINK, GRAFANA_DASHBOARDS } from '../constants';
import { useIntl } from 'react-intl';
import { VolumeTab, MetricsActionContainer } from './style/CommonLayoutStyle';
import {
  VolumeIOPSChart,
  VolumeLatencyChart,
  VolumeThroughputChart,
  VolumeUsageChart,
} from './VolumeCharts';
import { SyncedCursorCharts } from '@scality/core-ui/dist/components/vegachartv2/SyncedCursorCharts';
import TimespanSelector from '../containers/TimespanSelector';
import { Icon, spacing } from '@scality/core-ui';

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
  padding-left: ${spacing.r12};
  height: calc(
    100vh - 48px - 2.857rem - 40px - 2.286rem
  ); //100vh - navbar height - tab height - padding - action container height
  overflow-y: auto;
`;
// No data rendering should be extracted to an common style
const NoMetricsText = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  padding: ${spacing.r8} 0 0 ${spacing.r24};
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
  const intl = useIntl();
  // @ts-expect-error - FIXME when you are working on it
  const config = useSelector((state) => state.config);
  return (
    <VolumeTab>
      <MetricsActionContainer>
        {config.api?.url_grafana && volumeNamespace && volumePVCName && (
          <a
            href={`${config.api.url_grafana}/d/${GRAFANA_DASHBOARDS.volumes}?var-namespace=${volumeNamespace}&var-volume=${volumePVCName}`}
            target="_blank"
            rel="noopener noreferrer"
            data-cy="advanced_metrics_volume_detailed"
          >
            <Button
              label={intl.formatMessage({
                id: 'advanced_metrics',
              })}
              variant={'secondary'}
              icon={<Icon name="External-link" />}
            />
          </a>
        )}
        {volumeCondition === VOLUME_CONDITION_LINK && <TimespanSelector />}
      </MetricsActionContainer>
      {volumeCondition === VOLUME_CONDITION_LINK ? (
        <SyncedCursorCharts>
          <GraphGrid id="graph_container">
            <VolumeUsageChart
              pvcName={volumePVCName}
              namespace={volumeNamespace}
              volumeName={volumeName}
            />

            <VolumeLatencyChart
              instanceIp={instanceIp}
              deviceName={deviceName}
              volumeName={volumeName}
            />

            <VolumeThroughputChart
              instanceIp={instanceIp}
              deviceName={deviceName}
              volumeName={volumeName}
            />

            <VolumeIOPSChart
              instanceIp={instanceIp}
              deviceName={deviceName}
              volumeName={volumeName}
            />
          </GraphGrid>
        </SyncedCursorCharts>
      ) : (
        <NoMetricsText>
          {intl.formatMessage({
            id: 'volume_is_not_bound',
          })}
        </NoMetricsText>
      )}
    </VolumeTab>
  );
};

export default MetricsTab;
