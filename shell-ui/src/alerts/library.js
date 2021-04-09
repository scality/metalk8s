import { version } from '../../package.json';
import AlertProvider, { useAlerts } from './AlertProvider';

window.shellUIAlerts = {
    ///spread shellUI to keep all versions libraries
    ...window.shellUIAlerts,
    [version]: {
      AlertProvider,
      useAlerts
    },
  };
  