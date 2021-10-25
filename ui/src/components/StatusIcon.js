import styled from 'styled-components';

import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_NONE,
  STATUS_HEALTH,
} from '../constants.js';

const StatusIcon = styled.i`
  color: ${(props) => {
    const theme = props.theme;
    let color;

    switch (props.status) {
      case STATUS_SUCCESS:
        color = theme.statusHealthy;
        break;
      case STATUS_WARNING:
        color = theme.statusWarning;
        break;
      case STATUS_CRITICAL:
        color = theme.statusCritical;
        break;
      case STATUS_NONE:
        color = theme.textTertiary;
        break;
      case STATUS_HEALTH:
        color = theme.statusHealthy;
        break;
      default:
        color = theme.textTertiary;
    }
    return color;
  }};
`;

export default StatusIcon;
