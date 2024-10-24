import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { Button } from '@scality/core-ui/dist/next';

import { VOLUME_CONDITION_LINK, GRAFANA_DASHBOARDS } from '../constants';
import { useIntl } from 'react-intl';
import {
  MetricsActionContainer,
  NotBoundContainer,
} from './style/CommonLayoutStyle';
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
  height: calc(100% - 3rem); //100% - padding - action container height
  overflow: auto;
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
    <>
      {volumeCondition === VOLUME_CONDITION_LINK ? (
        <>
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
        </>
      ) : (
        <NotBoundContainer pt={spacing.r16}>
          {intl.formatMessage({
            id: 'volume_is_not_bound',
          })}
        </NotBoundContainer>
      )}
    </>
  );
};

export default MetricsTab;
