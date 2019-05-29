// Actions
const ADD_JOB = 'REMOVE_JOB';
const REMOVE_JOB = 'UPDATE_JOBS';

// Reducer
const defaultState = {
  jobs: []
};

export default function reducer(state = defaultState, action = {}) {
  switch (action.type) {
    case ADD_JOB:
      return { ...state, jobs: [...state.jobs, action.payload] };
    case REMOVE_JOB:
      return {
        ...state,
        jobs: state.jobs.filter(job => job !== action.payload)
      };
    default:
      return state;
  }
}

// Action Creators
export function addJobAction(job) {
  return { type: ADD_JOB, payload: job };
}

export function removeJobAction(job) {
  return { type: REMOVE_JOB, payload: job };
}
