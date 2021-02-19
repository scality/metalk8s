import React from 'react';
import { Healthselector } from '@scality/core-ui';
import { useHistory, useRouteMatch } from 'react-router';
import { useQuery } from '../services/utils';
import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_HEALTH,
} from '../constants.js';

const ActiveAlertsFilter = (props) => {
  const history = useHistory();
  const query = useQuery();
  const match = useRouteMatch();
  const selectedFilter = query.get('severity');

  let items = [
    {
      label: 'All',
      onClick: () => {
        query.delete('severity');
        history.push(`${match.url}?${query.toString()}`);
      },
      selected: !selectedFilter,
    },
    {
      label: 'Health',
      onClick: () => {
        query.set('severity', STATUS_HEALTH);
        history.push(`${match.url}?${query.toString()}`);
      },
      selected: selectedFilter === STATUS_HEALTH,
    },
    {
      label: 'Warning',
      onClick: () => {
        query.set('severity', STATUS_WARNING);
        history.push(`${match.url}?${query.toString()}`);
      },
      selected: selectedFilter === STATUS_WARNING,
    },
    {
      label: 'Critical',
      onClick: () => {
        query.set('severity', STATUS_CRITICAL);
        history.push(`${match.url}?${query.toString()}`);
      },
      selected: selectedFilter === STATUS_CRITICAL,
    },
  ];

  return <Healthselector items={items} data-cy="alert_filter" />;
};

export default ActiveAlertsFilter;
