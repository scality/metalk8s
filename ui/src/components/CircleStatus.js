import React from 'react';
import styled from 'styled-components';

import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_NONE,
  STATUS_HEALTH,
  CIRCLE_BASE_SIZE,
  CIRCLE_DOUBLE_SIZE,
} from '../constants.js';

const Circle = styled.i`
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

class CircleStatus extends React.Component {
  render() {
    const { status, size } = this.props;
    if (size === undefined || size === CIRCLE_BASE_SIZE) {
      if (status === STATUS_NONE) {
        return (
          <Circle
            className="far fa-circle"
            status={status}
            aria-label={`status ${status}`}
          />
        );
      } else {
        return (
          <Circle
            className="fas fa-circle"
            status={status}
            aria-label={`status ${status}`}
          />
        );
      }
    } else if (size === CIRCLE_DOUBLE_SIZE) {
      if (status === STATUS_NONE) {
        return (
          <Circle
            className="far fa-circle fa-2x"
            status={status}
            aria-label={`status ${status}`}
          />
        );
      } else {
        return (
          <Circle
            className="fas fa-circle fa-2x"
            status={status}
            aria-label={`status ${status}`}
          />
        );
      }
    }
  }
}

export default CircleStatus;
