import packageJson from '../../package.json';
const { version } = packageJson;
import * as alertLibrary from './AlertProvider';
import * as alertHook from './services/alertHooks';

window.shellUIAlerts = {
  ///spread shellUI to keep all versions libraries
  ...window.shellUIAlerts,
  [version]: { ...alertLibrary, ...alertHook },
};
