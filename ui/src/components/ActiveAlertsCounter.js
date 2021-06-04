import React from 'react';
import styled from 'styled-components';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { STATUS_WARNING, STATUS_CRITICAL } from '../constants.js';

export const CountersWrapper = styled.div`
  color: ${(props) => props.theme.textPrimary};
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
    const theme = props.theme;
    let color = theme.textPrimary;

    switch (props.status) {
      case STATUS_WARNING:
        color = theme.statusWarning;
        break;
      case STATUS_CRITICAL:
        color = theme.statusCritical;
        break;
      default:
        color = theme.textPrimary;
    }
    return color;
  }};
`;

const ActiveAlertsCounter = (props) => {
  const { criticalCounter, warningCounter } = props;
  const history = useHistory();
  const location = useLocation();
  let { url } = useRouteMatch();
  const getLink = (status) => {
    const query = new URLSearchParams(location.search);
    const existing = query.getAll('severity');
    if (existing.indexOf(status) === -1) {
      query.set('severity', status);
    }
    url = url?.replace(/\/overview/, '/alerts');
    return `${url}?${query.toString()}`;
  };

  return (
    <CountersWrapper>
      <CounterWrapper
        onClick={() => history.push(getLink(STATUS_CRITICAL))}
        data-cy="critical_counter_node"
      >
        <CounterTitle>Critical</CounterTitle>
        <CounterValueWrapper>
          <CounterIcon
            className="fas fa-times-circle"
            status={STATUS_CRITICAL}
          />
          <CounterValue>{criticalCounter}</CounterValue>
        </CounterValueWrapper>
      </CounterWrapper>
      <CounterWrapper
        onClick={() => history.push(getLink(STATUS_WARNING))}
        data-cy="warning_counter_node"
      >
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
