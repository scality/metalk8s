import React from 'react';
import styled from 'styled-components';

const STATUS_WARNING = 'warning';
const STATUS_CRITICAL = 'critical';
const STATUS_NONE = 'none';

const Circle = styled.i`
  color: ${props => {
    const theme = props.theme.brand;
    let color = theme.base;

    switch (props.status) {
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
