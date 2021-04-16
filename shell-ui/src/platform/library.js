import { version } from '../../package.json';
import * as k8s from './service/k8s';

window.shellUIPlatform = {
  ///spread shellUI to keep all versions libraries
  ...window.shellUIPlatform,
  [version]: k8s,
};
