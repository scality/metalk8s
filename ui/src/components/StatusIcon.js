import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
import {
  STATUS_WARNING,
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_NONE,
  STATUS_HEALTH,
} from '../constants.js';

const StatusIcon = ({ name, status }) => {
  const color = (() => {
    switch (status) {
      case STATUS_SUCCESS:
        return 'statusHealthy';
      case STATUS_WARNING:
        return 'statusWarning';
      case STATUS_CRITICAL:
        return 'statusCritical';
      case STATUS_NONE:
        return 'textTertiary';
      case STATUS_HEALTH:
        return 'statusHealthy';
      default:
        return 'textTertiary';
    }
  })();
  return <Icon color={color} name={name} />;
};

export default StatusIcon;
