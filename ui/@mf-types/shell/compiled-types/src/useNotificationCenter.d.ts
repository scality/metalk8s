import { Notification } from './NotificationCenterProvider';
export declare const useNotificationCenter: () => {
    notifications: import("./NotificationCenterProvider").InternalNotification[];
    readAllNotifications: () => void;
    publish: (notification: Notification) => void;
    unPublish: (id: string) => void;
};
