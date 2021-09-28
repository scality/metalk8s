//@flow
import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { Button } from '@scality/core-ui/dist/next';
import { padding, fontSize, spacing } from '@scality/core-ui/dist/style/theme';
import { VOLUME_CONDITION_LINK, GRAFANA_DASHBOARDS } from '../constants';
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
import TimespanSelector from '../containers/TimespanSelector';

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
  const intl = useIntl();
  const config = useSelector((state) => state.config);

  return (
    <VolumeTab>
      <MetricGraphCardContainer>
        <MetricsActionContainer>
          {config.api?.url_grafana && volumeNamespace && volumePVCName && (
            <a
              href={`${config.api.url_grafana}/d/${GRAFANA_DASHBOARDS.volumes}?var-namespace=${volumeNamespace}&var-volume=${volumePVCName}`}
              target="_blank"
              rel="noopener noreferrer"
              data-cy="advanced_metrics_volume_detailed"
            >
              <Button
                label={intl.formatMessage({ id: 'advanced_metrics' })}
                variant={'secondary'}
                icon={<i className="fas fa-external-link-alt" />}
              />
            </a>
          )}
          {volumeCondition === VOLUME_CONDITION_LINK && <TimespanSelector />}
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
