import { Icon } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { GRAFANA_DASHBOARDS } from '../constants';
import { useTypedSelector } from '../hooks';

/* Opens the Grafana node dashboard, which covers everything the Network and the
   Metrics panels chart. It belongs to neither panel in particular, so it sits in
   the page's context bar next to the timespan selector, the other control the
   two panels share. */
const AdvancedMetricsButton = () => {
  const intl = useIntl();
  const { url_grafana } = useTypedSelector((state) => state.config.api);

  if (!url_grafana) {
    return null;
  }

  return (
    <a
      href={`${url_grafana}/d/${GRAFANA_DASHBOARDS.nodes}`}
      target="_blank"
      rel="noopener noreferrer"
      data-cy="advanced_metrics_node_detailed"
    >
      <Button
        label={intl.formatMessage({
          id: 'advanced_metrics',
        })}
        variant={'secondary'}
        icon={<Icon name="External-link" />}
        iconOnly={560}
      />
    </a>
  );
};

export default AdvancedMetricsButton;
