// history.js
import { createBrowserHistory } from 'history';

const history = createBrowserHistory({
  /* pass a configuration object here if needed */
});

if (window.Cypress) window.__history__ = history;

export default history;
