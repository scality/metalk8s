import { Icon } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { GRAFANA_DASHBOARDS } from '../constants';
import { useTypedSelector } from '../hooks';

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
