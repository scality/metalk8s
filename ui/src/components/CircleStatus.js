import React from 'react';
import { Icon } from '@scality/core-ui';

import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_NONE,
  STATUS_HEALTH,
  CIRCLE_BASE_SIZE,
  CIRCLE_DOUBLE_SIZE,
} from '../constants.js';

const getStyle = (status) => {
  switch (status) {
    case STATUS_SUCCESS:
    case STATUS_HEALTH:
      return {
        name: "Check-circle",
        color: "statusHealthy"
      }
    case STATUS_WARNING:
      return {
        name: "Exclamation-circle",
        color: "statusWarning"
      }
    case STATUS_CRITICAL:
      return {
        name: "Times-circle",
        color: "statusCritical"
      }
    case STATUS_NONE:
    default: 
      return {
        name: "Dot-circle",
        color: "infoPrimary"
      }
  }
}

class CircleStatus extends React.Component {
  shouldComponentUpdate({ status }) {
    return this.props.status !== status;
  }

  render() {
    const { status, size } = this.props;
    const { name, color } = getStyle(status);
    if (size === undefined || size === CIRCLE_BASE_SIZE || size === CIRCLE_DOUBLE_SIZE)
      return (
        <Icon name={name} color={color} size={size === CIRCLE_DOUBLE_SIZE ? "2x" : "1x"}/>
      );
  }
}

export default CircleStatus;
