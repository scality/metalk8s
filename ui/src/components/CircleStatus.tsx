import { Icon } from '@scality/core-ui';
import {
  CIRCLE_DOUBLE_SIZE,
  STATUS_CRITICAL,
  STATUS_HEALTH,
  STATUS_NONE,
  STATUS_SUCCESS,
  STATUS_WARNING,
} from '../constants';
import { IconName } from '@scality/core-ui/dist/components/icon/Icon.component';

export const getStyle = (status) => {
  switch (status) {
    case STATUS_SUCCESS:
    case STATUS_HEALTH:
      return {
        name: 'Check-circle',
        color: 'statusHealthy',
      };

    case STATUS_WARNING:
      return {
        name: 'Exclamation-circle',
        color: 'statusWarning',
      };

    case STATUS_CRITICAL:
      return {
        name: 'Times-circle',
        color: 'statusCritical',
      };

    case STATUS_NONE:
    default:
      return {
        name: 'Dot-circle',
        color: 'infoPrimary',
      };
  }
};

const CircleStatus = (props) => {
  const { status, size } = props;
  const { name, color } = getStyle(status);

  return (
    <i>
      <Icon
        name={name as IconName}
        color={color}
        size={size === CIRCLE_DOUBLE_SIZE ? '2x' : '1x'}
        ariaLabel={`status ${status}`}
      />
    </i>
  );
};

export default CircleStatus;
