// history.js
import { createBrowserHistory } from 'history';

let basename = '';
export const setHistoryBaseName = name => {
  basename = name;
};

export default createBrowserHistory({
  /* pass a configuration object here if needed */
  basename,
});
