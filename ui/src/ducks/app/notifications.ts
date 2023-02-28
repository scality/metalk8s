import uuidv1 from 'uuid/v1';
// Actions
export const ADD_NOTIFICATION_SUCCESS = 'ADD_NOTIFICATION_SUCCESS';
export const ADD_NOTIFICATION_ERROR = 'ADD_NOTIFICATION_ERROR';
const REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION';
// Reducer
const defaultState = {
  list: [],
};
type Notification = {
  uid: string;
  title: string;
  message: string;
  variant: 'success' | 'danger';
  dismissAfter: number;
};
export type NotificationsState = {
  list: Notification[];
};
export type NotificationsActions =
  | {
      type: 'ADD_NOTIFICATION_SUCCESS' | 'ADD_NOTIFICATION_ERROR';
      payload: Notification;
    }
  | {
      type: 'REMOVE_NOTIFICATION';
      uid: string;
    };
export default function reducer(
  state: NotificationsState = defaultState,
  action: NotificationsActions,
): NotificationsState {
  switch (action.type) {
    case ADD_NOTIFICATION_SUCCESS:
    case ADD_NOTIFICATION_ERROR:
      return { ...state, list: [...state.list, action.payload] };

    case REMOVE_NOTIFICATION:
      return {
        ...state,
        list: state.list.filter((notif) => notif.uid !== action.uid),
      };

    default:
      return state;
  }
} // Action Creators

export const addNotificationSuccessAction = (payload: {
  title: string;
  message: string;
}) => {
  return {
    type: ADD_NOTIFICATION_SUCCESS,
    payload: {
      uid: uuidv1(),
      title: payload.title,
      message: payload.message,
      variant: 'success',
      dismissAfter: 5000,
    },
  };
};
export const addNotificationErrorAction = (payload: {
  title: string;
  message?: string;
}) => {
  return {
    type: ADD_NOTIFICATION_ERROR,
    payload: {
      uid: uuidv1(),
      title: payload.title,
      message: payload.message,
      variant: 'danger',
    },
  };
};
export const removeNotificationAction = (uid: string) => {
  return {
    type: REMOVE_NOTIFICATION,
    uid,
  };
};