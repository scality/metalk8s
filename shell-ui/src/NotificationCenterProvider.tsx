import React, { Dispatch, createContext, useReducer } from 'react';

export type Notification = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  redirectUrl: string;
  createdOn: Date;
};

export type InternalNotification = Notification & {
  readOn?: Date;
};

export type NotificationCenterContextType = {
  notifications: InternalNotification[];
  dispatch: Dispatch<NotificationCenterActions>;
};

if (!window.shellContexts) {
  //@ts-ignore
  window.shellContexts = {};
}
if (!window.shellContexts.NotificationContext) {
  window.shellContexts.NotificationContext =
    createContext<NotificationCenterContextType | null>(null);
}
export const NotificationCenterContext =
  window.shellContexts.NotificationContext;

export enum NotificationActionType {
  PUBLISH,
  UNPUBLISH,
  READ_ALL,
}

export type NotificationCenterActions =
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
        // if the Notification is already stored, update it with the newly published one.
        if (state.find((n) => n.id === action.notification.id)) {
          return state.map((n) => {
            if (n.id === action.notification.id) {
              return { ...action.notification, readOn };
            }
            return n;
          });
        }
        // sort the Notifications by the createdOn date
        const index = state.findIndex(
          (n) =>
            n.createdOn.getTime() > action.notification.createdOn.getTime(),
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
