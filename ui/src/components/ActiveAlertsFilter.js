import React from 'react';
import styled from 'styled-components';
import { Dropdown } from '@scality/core-ui';
import { useHistory } from 'react-router';
import { useQuery } from '../services/utils';
import { padding } from '@scality/core-ui/dist/style/theme';
import { STATUS_WARNING, STATUS_CRITICAL } from '../constants.js';

export const FilterIcon = styled.i`
  color: ${(props) => {
    const theme = props.theme.brand;
    let color = theme.textPrimary;

    switch (props.status) {
      case STATUS_WARNING:
        color = theme.warning;
        break;
      case STATUS_CRITICAL:
        color = theme.danger;
        break;
      default:
        color = theme.textPrimary;
    }
    return color;
  }};
  padding: ${padding.smaller};
`;

export const ActiveAlertsFilterWrapper = styled.div`
  .sc-dropdown {
    width: 140px;
  }
  .sc-dropdown > div {
    background-color: ${(props) => props.theme.brand.info};
    width: 140px;
  }
`;

const ActiveAlertsFilter = (props) => {
  const history = useHistory();
  const query = useQuery();
  const selectedFilter = query.get('severity');

  let items = [
    {
      label: 'ALL',
      value: 'all',
      onClick: () => {
        query.delete('severity');
        history.push(`?${query.toString()}`);
      },
      iconCode: '',
      'data-cy': 'severity_all',
    },
    {
      label: 'CRITICAL',
      value: STATUS_CRITICAL,
      onClick: () => {
        query.set('severity', STATUS_CRITICAL);
        history.push(`?${query.toString()}`);
      },
      iconCode: 'fas fa-times-circle',
      'data-cy': 'severity_critical',
    },
    {
      label: 'WARNING',
      value: STATUS_WARNING,
      onClick: () => {
        query.set('severity', STATUS_WARNING);
        history.push(`?${query.toString()}`);
      },
      iconCode: 'fas fa-exclamation-triangle',
      'data-cy': 'severity_warning',
    },
  ];

  const dropDownLabel = (() => {
    if (!selectedFilter) return items[0].label;

    const item = items.find((item) => item.value === selectedFilter);
    return (
      <span>
        {item.value !== 'all' && (
          <FilterIcon status={item.value} className={item.iconCode} />
        )}
        {item.label}
      </span>
    );
  })();

  if (selectedFilter) {
    items = items.filter((item) => item.value !== selectedFilter);
  } else {
    items.splice(0, 1);
  }

  return (
    <ActiveAlertsFilterWrapper>
      <Dropdown
        items={items}
        text={dropDownLabel}
        size="small"
        data-cy="alert_filter"
      />
    </ActiveAlertsFilterWrapper>
  );
};

export default ActiveAlertsFilter;
