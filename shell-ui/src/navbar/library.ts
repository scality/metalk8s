import {
  AUTHENTICATED_EVENT,
  LANGUAGE_CHANGED_EVENT,
  THEME_CHANGED_EVENT,
} from './events';
import packageJson from '../../package.json';
const { version } = packageJson;
window.shellUINavbar = {
  ///spread shellUI to keep all versions libraries
  ...window.shellUINavbar,
  [version]: {
    isAuthenticatedEvent: (evt) => evt.detail && evt.detail.profile,
    events: {
      AUTHENTICATED_EVENT,
      LANGUAGE_CHANGED_EVENT,
      THEME_CHANGED_EVENT,
    },
  },
};