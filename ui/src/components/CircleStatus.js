import React from 'react';
import styled from 'styled-components';

import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_NONE,
  STATUS_HEALTH,
} from '../constants.js';

const Circle = styled.i`
  color: ${(props) => {
    const theme = props.theme.brand;
    let color = theme.textPrimary;

    switch (props.status) {
      case STATUS_SUCCESS:
        color = theme.success;
        break;
      case STATUS_WARNING:
        color = theme.warning;
        break;
      case STATUS_CRITICAL:
        color = theme.danger;
        break;
      case STATUS_NONE:
        color = theme.textPrimary;
        break;
      case STATUS_HEALTH:
        color = theme.healthy;
        break;
      default:
        color = theme.textPrimary;
    }
    return color;
  }};
`;

class CircleStatus extends React.Component {
  render() {
    const { status } = this.props;
    if (status === STATUS_NONE) {
      return <Circle className="far fa-circle" status={status} />;
    } else {
      return <Circle className="fas fa-circle" status={status} />;
    }
  }
}

export default CircleStatus;
