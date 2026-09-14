import { defaultOptions } from '@scality/core-ui/dist/components/healthselectorv2/HealthSelector.component';
import { HealthSelector } from '@scality/core-ui/dist/next';
import { useLocation, useNavigate } from 'react-router';
import { useURLQuery } from '../services/utils';

const ActiveAlertsFilter = () => {
  const navigate = useNavigate();
  const query = useURLQuery();
  const { pathname } = useLocation();
  const selectedFilter = query.get('severity') ?? 'all';

  const displayOptions = ['all', 'warning', 'critical'];
  const options = defaultOptions.filter((option) => displayOptions.includes(option.value));

  return (
    <HealthSelector
      size="1/2"
      id="alert_filter"
      onChange={(newValue) => {
        query.set('severity', newValue);
        navigate(`${pathname}?${query.toString()}`);
      }}
      value={selectedFilter}
      options={options}
      aria-label="Filter by severity"
      data-cy="alert_filter"
    />
  );
};

export default ActiveAlertsFilter;
