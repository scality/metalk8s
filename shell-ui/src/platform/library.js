import { version } from '../../package.json';
import * as k8s from './service/k8s';

window.shellUIAlerts = {
  ///spread shellUI to keep all versions libraries
  ...window.shellUIAlerts,
  [version]: k8s,
};
