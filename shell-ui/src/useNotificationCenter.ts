import { Dispatch, useContext } from 'react';
import {
  Notification,
  NotificationActionType,
  NotificationCenterActions,
  NotificationCenterContext,
} from './NotificationCenterProvider';

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
