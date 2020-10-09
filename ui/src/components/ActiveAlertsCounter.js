import React from 'react';
import styled from 'styled-components';
import { useHistory, useLocation } from 'react-router';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { STATUS_WARNING, STATUS_CRITICAL } from '../constants.js';

export const CountersWrapper = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  display: flex;
  justify-content: space-around;
`;

export const CounterWrapper = styled.div`
  display: flex;
  flex-direction: column;
  cursor: pointer;
`;

export const CounterValueWrapper = styled.div`
  display: flex;
  align-items: center;
`;

export const CounterTitle = styled.div`
  padding: ${padding.smaller} 0px;
  text-align: center;
  font-size: ${fontSize.small};
`;
export const CounterValue = styled.div`
  font-size: ${fontSize.larger};
  padding-left: ${padding.smaller};
`;

export const CounterIcon = styled.i`
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
`;

const ActiveAlertsCounter = (props) => {
  const { alerts, baseLink } = props;
  const history = useHistory();
  const location = useLocation();

  const getLink = (status) => {
    const query = new URLSearchParams(location.search);
    const existing = query.getAll('severity');
    if (existing.indexOf(status) === -1) {
      query.set('severity', status);
    }
    return `${baseLink}?${query.toString()}`;
  };

  const criticalCounter = alerts?.filter(
    (item) => item?.labels?.severity === STATUS_CRITICAL,
  ).length;
  const warningCounter = alerts?.filter(
    (item) => item?.labels?.severity === STATUS_WARNING,
  ).length;

  return (
    <CountersWrapper>
      <CounterWrapper onClick={() => history.push(getLink(STATUS_CRITICAL))}>
        <CounterTitle>Critical</CounterTitle>
        <CounterValueWrapper>
          <CounterIcon
            className="fas fa-times-circle"
            status={STATUS_CRITICAL}
          />
          <CounterValue>{criticalCounter}</CounterValue>
        </CounterValueWrapper>
      </CounterWrapper>
      <CounterWrapper onClick={() => history.push(getLink(STATUS_WARNING))}>
        <CounterTitle>Warning</CounterTitle>
        <CounterValueWrapper>
          <CounterIcon
            className="fas fa-exclamation-triangle"
            status={STATUS_WARNING}
          />
          <CounterValue>{warningCounter}</CounterValue>
        </CounterValueWrapper>
      </CounterWrapper>
    </CountersWrapper>
  );
};

export default ActiveAlertsCounter;
