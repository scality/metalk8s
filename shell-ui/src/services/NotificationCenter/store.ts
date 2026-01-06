import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

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

type NotificationCenterState = {
  notifications: InternalNotification[];
  // Actions
  publish: (notification: Notification) => void;
  unPublish: (id: string) => void;
  readAllNotifications: () => void;
  // Selectors
  getUnreadCount: () => number;
  hasUnreadNotifications: () => boolean;
};

const LOCAL_STORAGE_NOTIFICATION_PREFIX = 'notification-center__';

/**
 * Vanilla Zustand store for notification center management.
 * This store can be used both inside and outside React components.
 * It's designed to be shared across micro-frontends via Module Federation.
 */
export const notificationCenterStore = createStore<NotificationCenterState>(
  (set, get) => ({
    notifications: [],

    publish: (notification: Notification) => {
      const storedReadOn = localStorage.getItem(
        LOCAL_STORAGE_NOTIFICATION_PREFIX + notification.id,
      );
      const readOn = storedReadOn ? new Date(storedReadOn) : undefined;

      set((state) => {
        const existing = state.notifications.find(
          (n) => n.id === notification.id,
        );
        if (existing) {
          return {
            notifications: state.notifications.map((n) =>
              n.id === notification.id ? { ...notification, readOn } : n,
            ),
          };
        }

        const newNotifications = [
          ...state.notifications,
          { ...notification, readOn },
        ];
        newNotifications.sort(
          (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
        );
        return { notifications: newNotifications };
      });
    },

    unPublish: (id: string) => {
      localStorage.removeItem(LOCAL_STORAGE_NOTIFICATION_PREFIX + id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    },

    readAllNotifications: () => {
      const date = new Date();
      set((state) => ({
        notifications: state.notifications.map((n) => {
          if (!n.readOn) {
            localStorage.setItem(
              LOCAL_STORAGE_NOTIFICATION_PREFIX + n.id,
              date.toISOString(),
            );
            return { ...n, readOn: date };
          }
          return n;
        }),
      }));
    },

    getUnreadCount: () => {
      return get().notifications.filter((n) => !n.readOn).length;
    },

    hasUnreadNotifications: () => {
      return get().notifications.some((n) => !n.readOn);
    },
  }),
);

/**
 * React hook to access the notification center store.
 * Use this in React components to subscribe to store updates.
 */
export const useNotificationCenterStore = <T>(
  selector: (state: NotificationCenterState) => T,
): T => {
  return useStore(notificationCenterStore, selector);
};

/**
 * React hook to get the full notification center store state.
 * Prefer using selectors with useNotificationCenterStore for better performance.
 */
export const useNotificationCenterStoreState = (): NotificationCenterState => {
  return useStore(notificationCenterStore);
};
