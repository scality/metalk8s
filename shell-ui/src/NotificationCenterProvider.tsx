import React, { Dispatch, createContext, useContext, useReducer } from 'react';

export type Notification = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  redirectUrl: string;
  createdAt: Date;
};

export type InternalNotification = Notification & {
  readOn?: Date;
};

type NotificationCenterContextType = {
  notifications: InternalNotification[];
  dispatch: Dispatch<NotificationCenterActions>;
};
const NotificationCenterContext =
  createContext<NotificationCenterContextType | null>(null);
enum NotificationActionType {
  PUBLISH,
  UNPUBLISH,
  READ_ALL,
}

type NotificationCenterActions =
  | {
      type: NotificationActionType.PUBLISH;
      notification: Notification;
    }
  | {
      type: NotificationActionType.UNPUBLISH;
      id: string;
    }
  | {
      type: NotificationActionType.READ_ALL;
    };

const publish =
  (dispatch: Dispatch<NotificationCenterActions>) =>
  (notification: Notification) => {
    dispatch({
      type: NotificationActionType.PUBLISH,
      notification: notification,
    });
  };
const unPublish =
  (dispatch: Dispatch<NotificationCenterActions>) => (id: string) => {
    dispatch({ type: NotificationActionType.UNPUBLISH, id: id });
  };

const readAllNotifications =
  (dispatch: Dispatch<NotificationCenterActions>) => () =>
    dispatch({ type: NotificationActionType.READ_ALL });

export const useNotificationCenter = () => {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error(
      'useNotificationCenter must be used within a NotificationCenterProvider',
    );
  }
  const { dispatch } = context;
  return {
    notifications: context.notifications,
    readAllNotifications: readAllNotifications(dispatch),
    publish: publish(dispatch),
    unPublish: unPublish(dispatch),
  };
};

const LOCAL_STORAGE_NOTIFICATION_PREFIX = 'notification-center__';

const NotificationCenterProvider = ({ children }) => {
  const notificationReducer = (
    state: InternalNotification[],
    action: NotificationCenterActions,
  ) => {
    switch (action.type) {
      case NotificationActionType.PUBLISH:
        const storedReadOn = localStorage.getItem(
          LOCAL_STORAGE_NOTIFICATION_PREFIX + action.notification.id,
        );
        const readOn = storedReadOn ? new Date(storedReadOn) : undefined;
        // if the Notification is already stored, direct return the state
        if (state.find((n) => n.id === action.notification.id)) {
          return state;
        }
        // sort the Notifications by the createdAt date
        const index = state.findIndex(
          (n) =>
            n.createdAt.getTime() > action.notification.createdAt.getTime(),
        );

        return [
          ...state.slice(0, index + 1),
          { ...action.notification, readOn },
          ...state.slice(index + 1),
        ];

      case NotificationActionType.UNPUBLISH:
        localStorage.removeItem(LOCAL_STORAGE_NOTIFICATION_PREFIX + action.id);
        return state.filter((n) => n.id !== action.id);
      case NotificationActionType.READ_ALL:
        const date = new Date();
        return state.map((n) => {
          if (!n.readOn) {
            localStorage.setItem(
              LOCAL_STORAGE_NOTIFICATION_PREFIX + n.id,
              date.toISOString(),
            );
            return { ...n, readOn: date };
          }
          return n;
        });
      default:
        return state;
    }
  };
  const [notifications, dispatch] = useReducer(notificationReducer, []);
  return (
    <NotificationCenterContext.Provider value={{ dispatch, notifications }}>
      {children}
    </NotificationCenterContext.Provider>
  );
};

export default NotificationCenterProvider;
