//@flow
import React from 'react';
import { queryTimeSpansCodes } from '@scality/core-ui/dist/components/constants';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import { useHistory } from 'react-router';
import {
  LAST_ONE_HOUR,
  LAST_SEVEN_DAYS,
  LAST_TWENTY_FOUR_HOURS,
} from '../constants';
import { useURLQuery } from '../services/utils';
import { Dropdown } from '@scality/core-ui';

const TimespanSelector = () => {
  const history = useHistory();
  const query = useURLQuery();
  const { label } = useMetricsTimeSpan();

  // Write the selected timespan in URL
  const writeUrlTimeSpan = (label) => {
    let formatted = queryTimeSpansCodes.find((item) => item.label === label);

    if (formatted) {
      query.set('from', formatted.query);
      history.push({ search: query.toString() });
    }
  };

  // Dropdown items
  const metricsTimeSpanItems = [
    LAST_SEVEN_DAYS,
    LAST_TWENTY_FOUR_HOURS,
    LAST_ONE_HOUR,
  ].map((option) => ({
    label: option,
    'data-cy': option,
    onClick: () => {
      writeUrlTimeSpan(option);
    },
    selected: label === option,
  }));
  const metricsTimeSpanDropdownItems = metricsTimeSpanItems.filter(
    (mTS) => mTS.label !== label,
  );

  return (
    <Dropdown
      icon={<i className="fas fa-calendar-minus" />}
      items={metricsTimeSpanDropdownItems}
      text={label}
      size="small"
      data-cy="metrics_timespan_selection"
      variant="backgroundLevel1"
    />
  );
};

export default TimespanSelector;
