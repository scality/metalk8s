import React, { Dispatch } from 'react';
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
export declare const NotificationCenterContext: React.Context<NotificationCenterContextType>;
export declare enum NotificationActionType {
    PUBLISH = 0,
    UNPUBLISH = 1,
    READ_ALL = 2
}
export type NotificationCenterActions = {
    type: NotificationActionType.PUBLISH;
    notification: Notification;
} | {
    type: NotificationActionType.UNPUBLISH;
    id: string;
} | {
    type: NotificationActionType.READ_ALL;
};
declare const NotificationCenterProvider: ({ children }: {
    children: any;
}) => JSX.Element;
export default NotificationCenterProvider;
