import { Notification } from './NotificationCenterProvider';
export declare const useNotificationCenter: () => {
    notifications: any;
    readAllNotifications: () => void;
    publish: (notification: Notification) => void;
    unPublish: (id: string) => void;
};
