import {
  Button,
  ChartLegend,
  ChartLegendWrapper,
} from '@scality/core-ui/dist/next';
import { useSelector } from 'react-redux';
import { Icon, spacing } from '@scality/core-ui';
import { useIntl } from 'react-intl';
import { GRAFANA_DASHBOARDS, VOLUME_CONDITION_LINK } from '../constants';

import TimespanSelector from '../containers/TimespanSelector';
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
import { GraphGrid, ChartContainer } from '../containers/NodePageMetricsTab';
import { createColorSet } from '../services/graphUtils';

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
        <ChartLegendWrapper colorSet={createColorSet}>
          <ChartContainer>
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
              {volumeCondition === VOLUME_CONDITION_LINK && (
                <TimespanSelector />
              )}
            </MetricsActionContainer>

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
            <ChartLegend shape="line" legendSize="Smaller" />
          </ChartContainer>
        </ChartLegendWrapper>
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
