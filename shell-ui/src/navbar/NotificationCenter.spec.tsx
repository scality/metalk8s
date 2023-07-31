import React, { PropsWithChildren } from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import NotificationCenterProvider, {
  InternalNotification,
  Notification,
  useNotificationCenter,
} from '../NotificationCenterProvider';
import NotificationCenter from './NotificationCenter';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { prepareRenderMultipleHooks } from './__TESTS__/testMultipleHooks';
import { MemoryRouter, Route, Switch } from 'react-router';
import { ShellHistoryProvider } from '../initFederation/ShellHistoryProvider';

export const notificationCenterSelectors = {
  notificationCenterButton: () =>
    screen.getByRole('button', { name: /notification center/i }),
  emptyNotificationCenterIcon: () =>
    screen.getByRole('img', { name: /Notification Center \(Empty\)/i }),
  noNotifications: () =>
    screen.getByText(/You have no new notifications at the moment./i),
  notification: (title: string | RegExp) =>
    screen.getByRole('option', { name: title }),
  notificationCenterComboBox: () =>
    screen.getByRole('combobox', { name: /notification center/i }),
};
describe('NotificationCenter', () => {
  const wrapper = ({ children }: PropsWithChildren<Record<string, never>>) => {
    return (
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ShellHistoryProvider>
            <NotificationCenterProvider>
              <NotificationCenter />
              <div>{children}</div>
              <Switch>
                <Route path="/" exact>
                  Home page
                </Route>
                <Route path="/alerts">Alert page</Route>
                <Route path="/license">License page</Route>
                <Route path="/new-version">New version page</Route>
              </Switch>
            </NotificationCenterProvider>
          </ShellHistoryProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  function publishNewNotifications(result: {
    current: {
      notifications: InternalNotification[];
      readAllNotifications: () => void;
      publish: (notification: Notification) => void;
      unPublish: (id: string) => void;
    };
    all: {
      notifications: InternalNotification[];
      readAllNotifications: () => void;
      publish: (notification: Notification) => void;
      unPublish: (id: string) => void;
    }[];
  }) {
    const TRIAL_LICENSE_EXPIRED = 'Your trial has expired 5 days ago.';
    const NEW_VERSION_AVAILABLE = 'A new version of Artesca is available.';
    const NEW_ALERTS = 'You have 12 alerts raised.';
    act(() => {
      result.current.publish({
        id: '1',
        title: 'License',
        description: TRIAL_LICENSE_EXPIRED,
        severity: 'critical',
        redirectUrl: '/license',
        createdOn: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
      });
      result.current.publish({
        id: '3',
        title: 'Alerts',
        description: NEW_ALERTS,
        severity: 'warning',
        redirectUrl: '/alerts',
        createdOn: new Date(),
      });
      result.current.publish({
        id: '2',
        title: 'Version',
        description: NEW_VERSION_AVAILABLE,
        severity: 'warning',
        redirectUrl: '/new-version',
        createdOn: new Date(new Date().getTime() - 10 * 60 * 1000),
      });
    });
    return { TRIAL_LICENSE_EXPIRED, NEW_ALERTS, NEW_VERSION_AVAILABLE };
  }
  const renderNotificationCenter = async () => {
    const { renderAdditionalHook, waitForWrapperToBeReady } =
      prepareRenderMultipleHooks({
        wrapper,
      });
    await waitForWrapperToBeReady();
    const { result, waitFor } = renderAdditionalHook(
      'useNotificationCenter',
      useNotificationCenter,
    );

    return { result, waitFor };
  };
  it('should display a super user friendly message when there is no notifications', async () => {
    //S
    prepareRenderMultipleHooks({
      wrapper,
    });
    //E
    await waitFor(() => {
      expect(
        notificationCenterSelectors.emptyNotificationCenterIcon(),
      ).toBeInTheDocument();
    });
    userEvent.click(notificationCenterSelectors.notificationCenterButton());
    //V
    expect(notificationCenterSelectors.noNotifications()).toBeInTheDocument();
  });

  it('should display the notifications, prioritizing by the created time', async () => {
    //S+E
    //We use the `prepareRenderMultipleHooks` to get the `screen`, which is not exposed by the React Hook Testing Library.
    const { result, waitFor } = await renderNotificationCenter();
    const { TRIAL_LICENSE_EXPIRED, NEW_ALERTS, NEW_VERSION_AVAILABLE } =
      publishNewNotifications(result);
    expect(
      notificationCenterSelectors.notificationCenterButton(),
    ).toBeInTheDocument();
    // Open the notification center
    userEvent.click(notificationCenterSelectors.notificationCenterButton());
    // Note that the waitFor from the React Hook Testing Library is different from the one from the React Testing Library.
    await waitFor(
      () => !!screen.queryByText(new RegExp(TRIAL_LICENSE_EXPIRED)),
    );

    //V the trial license expired is the first notification list
    expect(screen.getAllByRole('option')[0]).toHaveTextContent(
      new RegExp(NEW_ALERTS),
    );
    //V the new version available is the second notification list
    expect(screen.getAllByRole('option')[1]).toHaveTextContent(
      new RegExp(NEW_VERSION_AVAILABLE),
    );
    //V the new alerts is the third notification list
    expect(screen.getAllByRole('option')[2]).toHaveTextContent(
      new RegExp(TRIAL_LICENSE_EXPIRED),
    );
    //V the notifications are marked as unread
    expect(
      within(screen.getAllByRole('option')[0]).getByRole('img', {
        name: /unread notification mark/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getAllByRole('option')[1]).getByRole('img', {
        name: /unread notification mark/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getAllByRole('option')[2]).getByRole('img', {
        name: /unread notification mark/i,
      }),
    ).toBeInTheDocument();

    //E close the notification center
    userEvent.click(notificationCenterSelectors.notificationCenterButton());
    //V the notification center is closed
    expect(screen.queryByRole('option')).not.toBeInTheDocument();

    //E open again the notification center
    userEvent.click(notificationCenterSelectors.notificationCenterButton());
    //V the notification are marked as read
    expect(
      within(screen.getAllByRole('option')[0]).queryByRole('img', {
        name: /unread notification mark/i,
      }),
    ).toBeNull();
    expect(
      within(screen.getAllByRole('option')[1]).queryByRole('img', {
        name: /unread notification mark/i,
      }),
    ).toBeNull();
    expect(
      within(screen.getAllByRole('option')[2]).queryByRole('img', {
        name: /unread notification mark/i,
      }),
    ).toBeNull();
  });

  it('can be navigated with the keyboard', async () => {
    const { result } = await renderNotificationCenter();
    const { TRIAL_LICENSE_EXPIRED, NEW_ALERTS, NEW_VERSION_AVAILABLE } =
      publishNewNotifications(result);
    const notificationCenterButton =
      notificationCenterSelectors.notificationCenterButton();
    userEvent.click(notificationCenterButton);
    const notificationCenterComboBox =
      notificationCenterSelectors.notificationCenterComboBox();
    userEvent.keyboard('{arrowdown}');
    const notification = notificationCenterSelectors.notification(
      new RegExp(NEW_ALERTS),
    );
    expect(
      notificationCenterComboBox.attributes.getNamedItem(
        'aria-activedescendant',
      )?.value,
    ).toBe(notification.id);
    userEvent.keyboard('{arrowdown}');
    const nextNotification = notificationCenterSelectors.notification(
      new RegExp(NEW_VERSION_AVAILABLE),
    );
    expect(
      notificationCenterComboBox.attributes.getNamedItem(
        'aria-activedescendant',
      )?.value,
    ).toBe(nextNotification.id);
    userEvent.keyboard('{arrowdown}');
    const lastNotification = notificationCenterSelectors.notification(
      new RegExp(TRIAL_LICENSE_EXPIRED),
    );
    expect(
      notificationCenterComboBox.attributes.getNamedItem(
        'aria-activedescendant',
      )?.value,
    ).toBe(lastNotification.id);

    userEvent.keyboard('{enter}');

    await waitFor(() => {
      expect(screen.getByText('License page')).toBeInTheDocument();
    });
  });

  it('should not display notifications with the same ID', async () => {
    //S
    const { result } = await renderNotificationCenter();
    //E
    publishNewNotifications(result);
    publishNewNotifications(result);
    userEvent.click(notificationCenterSelectors.notificationCenterButton());
    //V
    expect(screen.getAllByRole('option').length).toBe(3);
  });
});
