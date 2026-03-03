import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import { useLocation, useNavigate, useResolvedPath } from 'react-router';
import styled from 'styled-components';
import { STATUS_CRITICAL, STATUS_WARNING } from '../constants';

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

const CounterIcon = ({ name, status }) => {
  const color = (() => {
    switch (status) {
      case STATUS_WARNING:
        return 'statusWarning';

      case STATUS_CRITICAL:
        return 'statusCritical';

      default:
        return 'textPrimary';
    }
  })();

  return <Icon color={color} name={name} />;
};

const ActiveAlertsCounter = (props) => {
  const { criticalCounter, warningCounter } = props;
  const navigate = useNavigate();
  const location = useLocation();
  let url = useResolvedPath('').pathname;

  const getLink = (status) => {
    const query = new URLSearchParams(location.search);
    const existing = query.getAll('severity');

    if (existing.indexOf(status) === -1) {
      query.set('severity', status);
    }

    url = '../alerts';
    return `${url}?${query.toString()}`;
  };

  return (
    <CountersWrapper>
      <CounterWrapper onClick={() => navigate(getLink(STATUS_CRITICAL))} data-cy="critical_counter_node">
        <CounterTitle>Critical</CounterTitle>
        <CounterValueWrapper>
          <CounterIcon name="Times-circle" status={STATUS_CRITICAL} />
          <CounterValue>{criticalCounter}</CounterValue>
        </CounterValueWrapper>
      </CounterWrapper>
      <CounterWrapper onClick={() => navigate(getLink(STATUS_WARNING))} data-cy="warning_counter_node">
        <CounterTitle>Warning</CounterTitle>
        <CounterValueWrapper>
          <CounterIcon name="Exclamation-circle" status={STATUS_WARNING} />
          <CounterValue>{warningCounter}</CounterValue>
        </CounterValueWrapper>
      </CounterWrapper>
    </CountersWrapper>
  );
};

export default ActiveAlertsCounter;
