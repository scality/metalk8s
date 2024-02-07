import packageJson from '../../package.json';
const { version } = packageJson;
import * as k8s from './service/k8s';
// @ts-expect-error - FIXME when you are working on it
window.shellUIPlatform = {
  ///spread shellUI to keep all versions libraries
  // @ts-expect-error - FIXME when you are working on it
  ...window.shellUIPlatform,
  [version]: k8s,
};
