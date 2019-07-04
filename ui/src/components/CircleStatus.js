import React from 'react';
import styled from 'styled-components';

import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_NONE
} from './constants';

const Circle = styled.i`
  color: ${props => {
    const theme = props.theme.brand;
    let color = theme.base;

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
        color = theme.base;
        break;
      default:
        color = theme.base;
    }

    return color;
  }};
`;

class CircleStatus extends React.Component {
  render() {
    const { status } = this.props;

    return <Circle className="fas fa-circle" status={status} />;
  }
}

export default CircleStatus;
