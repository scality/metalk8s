import { version } from '../../package.json';

window.shellUIAlerts = {
    ///spread shellUI to keep all versions libraries
    ...window.shellUIAlerts,
    [version]: {
      //todo
    },
  };
  