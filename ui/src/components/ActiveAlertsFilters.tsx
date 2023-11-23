import { defaultOptions } from '@scality/core-ui/dist/components/healthselectorv2/HealthSelector.component';
import { HealthSelector } from '@scality/core-ui/dist/next';
import { useHistory, useRouteMatch } from 'react-router';
import { useURLQuery } from '../services/utils';

const ActiveAlertsFilter = () => {
  const history = useHistory();
  const query = useURLQuery();
  const match = useRouteMatch();
  const selectedFilter = query.get('severity') ?? 'all';

  const displayOptions = ['all', 'warning', 'critical'];
  const options = defaultOptions.filter((option) =>
    displayOptions.includes(option.value),
  );

  return (
    <HealthSelector
      id="alert_filter"
      onChange={(newValue) => {
        query.set('severity', newValue);
        history.push(`${match.url}?${query.toString()}`);
      }}
      value={selectedFilter}
      options={options}
      data-cy="alert_filter"
    />
  );
};

export default ActiveAlertsFilter;
