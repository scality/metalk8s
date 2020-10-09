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

const ActiveAlertsFilter = (props) => {
  const { baseLink } = props;
  const history = useHistory();
  const query = useQuery();
  const selectedFilter = query.get('severity');

  let items = [
    {
      label: 'All',
      value: 'all',
      onClick: () => {
        query.delete('severity');
        history.push(`${baseLink}?${query.toString()}`);
      },
      iconCode: '',
    },
    {
      label: 'Critical',
      value: STATUS_CRITICAL,
      onClick: () => {
        query.set('severity', STATUS_CRITICAL);
        history.push(`${baseLink}?${query.toString()}`);
      },
      iconCode: 'fas fa-times-circle',
    },
    {
      label: 'Warning',
      value: STATUS_WARNING,
      onClick: () => {
        query.set('severity', STATUS_WARNING);
        history.push(`${baseLink}?${query.toString()}`);
      },
      iconCode: 'fas fa-exclamation-triangle',
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

  return <Dropdown items={items} text={dropDownLabel} size="small" />;
};

export default ActiveAlertsFilter;
