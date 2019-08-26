import { call, put, takeEvery, select, delay } from 'redux-saga/effects';
import { mergeTheme } from '@scality/core-ui/dist/utils';
import * as defaultTheme from '@scality/core-ui/dist/style/theme';
import * as Api from '../services/api';
import * as ApiK8s from '../services/k8s/api';
import * as ApiSalt from '../services/salt/api';
import * as ApiPrometheus from '../services/prometheus/api';
import { fetchUserInfo } from './login';
import { EN_LANG, FR_LANG, LANGUAGE } from '../constants';
import { REFRESH_TIMEOUT } from '../constants';

// Actions
export const SET_LANG = 'SET_LANG';
export const SET_THEME = 'SET_THEME';
export const SET_SOLUTIONS = 'SET_SOLUTIONS';
export const SET_SOLUTIONS_REFRESHING = 'SET_SOLUTIONS_REFRESHING';
export const SET_SERVICES = 'SET_SERVICES';

const REFRESH_SOLUTIONS = 'REFRESH_SOLUTIONS';
const STOP_REFRESH_SOLUTIONS = 'STOP_REFRESH_SOLUTIONS';

const FETCH_THEME = 'FETCH_THEME';
const FETCH_CONFIG = 'FETCH_CONFIG';
export const SET_API_CONFIG = 'SET_API_CONFIG';
const SET_INITIAL_LANGUAGE = 'SET_INITIAL_LANGUAGE';
const UPDATE_LANGUAGE = 'UPDATE_LANGUAGE';

const APP_K8S_PART_OF_SOLUTION_LABEL = 'app.kubernetes.io/part-of';
const APP_K8S_VERSION_LABEL = 'app.kubernetes.io/version';

// Reducer
const defaultState = {
  language: EN_LANG,
  theme: {},
  api: null,
  solutions: [],
  services: [],
  isSolutionsRefreshing: false
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case SET_LANG:
      return { ...state, language: action.payload };
    case SET_THEME:
      return { ...state, theme: action.payload };
    case SET_API_CONFIG:
      return { ...state, api: action.payload };
    case SET_SOLUTIONS:
      return { ...state, solutions: action.payload };
    case SET_SERVICES:
      return { ...state, services: action.payload };
    case SET_SOLUTIONS_REFRESHING:
      return { ...state, isSolutionsRefreshing: action.payload };
    default:
      return state;
  }
}

// Action Creators
export function setLanguageAction(newLang) {
  return { type: SET_LANG, payload: newLang };
}

export function setThemeAction(theme) {
  return { type: SET_THEME, payload: theme };
}

export function setSolutionsAction(solutions) {
  return { type: SET_SOLUTIONS, payload: solutions };
}

export function setSolutionsRefeshingAction(payload) {
  return { type: SET_SOLUTIONS_REFRESHING, payload };
}

export function setServicesAction(services) {
  return { type: SET_SERVICES, payload: services };
}

export function fetchThemeAction() {
  return { type: FETCH_THEME };
}

export function fetchConfigAction() {
  return { type: FETCH_CONFIG };
}

export function setApiConfigAction(conf) {
  return { type: SET_API_CONFIG, payload: conf };
}

export function setInitialLanguageAction() {
  return { type: SET_INITIAL_LANGUAGE };
}

export function updateLanguageAction(language) {
  return { type: UPDATE_LANGUAGE, payload: language };
}

export const refreshSolutionsAction = () => {
  return { type: REFRESH_SOLUTIONS };
};

export const stopRefreshSolutionsAction = () => {
  return { type: STOP_REFRESH_SOLUTIONS };
};

// Sagas
export function* fetchTheme() {
  const result = yield call(Api.fetchTheme);
  if (!result.error) {
    result.brand = mergeTheme(result, defaultTheme);
    yield put(setThemeAction(result));
  }
}

export function* fetchConfig() {
  yield call(Api.initialize, process.env.PUBLIC_URL);
  const result = yield call(Api.fetchConfig);
  if (!result.error) {
    yield call(fetchTheme);
    yield put(setApiConfigAction(result));
    yield call(ApiK8s.initialize, result.url);
    yield call(ApiSalt.initialize, result.url_salt);
    yield call(ApiPrometheus.initialize, result.url_prometheus);
    yield call(fetchUserInfo);
  }
}

export function* setInitialLanguage() {
  const languageLocalStorage = localStorage.getItem(LANGUAGE);
  if (languageLocalStorage) {
    languageLocalStorage === FR_LANG
      ? yield put(setLanguageAction(FR_LANG))
      : yield put(setLanguageAction(EN_LANG));
  } else {
    yield put(
      setLanguageAction(navigator.language.startsWith('fr') ? FR_LANG : EN_LANG)
    );
  }
}

export function* updateLanguage(action) {
  yield put(setLanguageAction(action.payload));
  const language = yield select(state => state.config.language);
  localStorage.setItem(LANGUAGE, language);
}

export function* fetchUIServices() {
  const result = yield call(ApiK8s.getUIServiceForAllNamespaces);
  if (!result.error) {
    yield put(setServicesAction(result.body.items));
  }
  return result;
}

export function* fetchSolutions() {
  const result = yield call(ApiK8s.getSolutionsConfigMapForAllNamespaces);
  if (!result.error) {
    const solutionsConfigMap = result.body.items[0];
    if (solutionsConfigMap && solutionsConfigMap.data) {
      const solutions = Object.keys(solutionsConfigMap.data).map(key => {
        return {
          name: key,
          versions: JSON.parse(solutionsConfigMap.data[key])
        };
      });
      const services = yield select(state => state.config.services);
      solutions.forEach(sol => {
        sol.versions.forEach(version => {
          if (version.deployed) {
            const sol_service = services.find(
              service =>
                service.metadata.labels &&
                service.metadata.labels[APP_K8S_PART_OF_SOLUTION_LABEL] ===
                  sol.name &&
                service.metadata.labels[APP_K8S_VERSION_LABEL] ===
                  version.version
            );
            version.ui_url = sol_service
              ? `http://localhost:${sol_service.spec.ports[0].nodePort}` // TO BE IMPROVED: we can not get the Solution UI's IP so far
              : '';
          }
        });
      });
      yield put(setSolutionsAction(solutions));
    }
  }
  return result;
}

export function* refreshSolutions() {
  yield put(setSolutionsRefeshingAction(true));

  const resultFetchUIServices = yield call(fetchUIServices);
  const resultFetchSolutions = yield call(fetchSolutions);

  if (!resultFetchSolutions.error && !resultFetchUIServices.error) {
    yield delay(REFRESH_TIMEOUT);
    const isRefreshing = yield select(
      state => state.config.isSolutionsRefreshing
    );
    if (isRefreshing) {
      yield call(refreshSolutions);
    }
  }
}

export function* stopRefreshSolutions() {
  yield put(setSolutionsRefeshingAction(false));
}

export function* configSaga() {
  yield takeEvery(FETCH_THEME, fetchTheme);
  yield takeEvery(FETCH_CONFIG, fetchConfig);
  yield takeEvery(SET_INITIAL_LANGUAGE, setInitialLanguage);
  yield takeEvery(UPDATE_LANGUAGE, updateLanguage);
  yield takeEvery(REFRESH_SOLUTIONS, refreshSolutions);
  yield takeEvery(STOP_REFRESH_SOLUTIONS, stopRefreshSolutions);
}
