import React from 'react';

import { useSelect } from 'downshift';
import styled, { useTheme } from 'styled-components';
import { Icon } from '@scality/core-ui/dist/components/icon/Icon.component';
import { Stack, Wrap, spacing } from '@scality/core-ui/dist/spacing';
import { Text } from '@scality/core-ui/dist/components/text/Text.component';
import { TextBadge } from '@scality/core-ui/dist/components/textbadge/TextBadge.component';
import { FormattedDateTime } from '@scality/core-ui/dist/components/date/FormattedDateTime';
import { Button } from '@scality/core-ui/dist/components/buttonv2/Buttonv2.component';
import { Box } from '@scality/core-ui/dist/components/box/Box';
import { useShellHistory } from '../initFederation/ShellHistoryProvider';
import { SleepingNotificationBell } from './SleepingNotificationBell';
import { useNotificationCenter } from '../useNotificationCenter';
import { ConstrainedText } from '@scality/core-ui/dist/components/constrainedtext/Constrainedtext.component';

/* Anchored to the bell's right edge rather than positioned against the viewport.
   The navbar lives inside the flex-1 content column, which the Guardian drawer
   narrows without changing window.innerWidth — so any viewport-derived offset
   lets this menu extend underneath the drawer. Anchoring right keeps it inside
   the column at any width, and needs no measurement to stay correct when the
   drawer opens (which resizes the column live, without a reload). */
const NotificationMenu = styled.ul`
  position: absolute;
  right: 0;
  width: 25rem;
  overflow: auto;
  list-style: none;
  padding: 0;
  margin: 0;
  z-index: 9000;
  background-color: ${(props) => props.theme.backgroundLevel1};
  border-radius: 0.1875rem;
  border: 1px solid ${(props) => props.theme.border};
  box-shadow: 0px 4px 10px 4px #000;
`;
const NotificationItem = styled.li<{
  $isHighlighted: boolean;
  $isRead: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.r8} ${spacing.r16};
  gap: ${spacing.r16};
  height: 4.5rem;
  cursor: pointer;
  &:not(:last-child) {
    border-bottom: 1px solid ${(props) => props.theme.border};
  }
  background-color: ${(props) =>
    props.$isHighlighted
      ? props.theme.highlight
      : props.$isRead
        ? props.theme.backgroundLevel4
        : props.theme.backgroundLevel3};
`;

const NotificationCenterHeader = styled.div`
  padding: ${spacing.r16};
  background-color: ${(props) => props.theme.backgroundLevel2};
  border-bottom: 1px solid ${(props) => props.theme.border};
`;

const NotificationCenter = () => {
  const { notifications, readAllNotifications } = useNotificationCenter();
  const theme = useTheme();
  const { isOpen, getToggleButtonProps, getMenuProps, highlightedIndex, getItemProps } = useSelect({
    items: notifications,
    onIsOpenChange: ({ isOpen }) => {
      if (!isOpen) {
        readAllNotifications();
      }
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) {
        return;
      }
      navigate(selectedItem.redirectUrl);
      readAllNotifications();
    },
  });
  const isAtLeastOneNotificationUnread = notifications.some((notification) => !notification.readOn);
  const navigate = useShellHistory();
  return (
    <div
      style={{ position: 'relative'}}
      {...getToggleButtonProps({
        'aria-label': 'Notification Center',
      })}
    >
      <Button
        style={isOpen ? { background: theme?.highlight } : { backgroundColor: 'transparent' }}
        icon={
          <span className="fa-layers fa-fw">
            <Icon
              aria-hidden="false"
              aria-label={!!notifications.length ? 'Notification Center' : 'Notification Center (Empty)'}
              name={notifications.length ? 'Alert' : 'Bell'}
              color={
                notifications.find((n) => n.severity === 'critical')
                  ? 'statusCritical'
                  : notifications.find((n) => n.severity === 'warning')
                    ? 'statusWarning'
                    : 'infoPrimary'
              }
              size="lg"
              style={
                isOpen
                  ? {
                      transform: 'rotate(15deg)',
                    }
                  : {}
              }
            />
            {isAtLeastOneNotificationUnread ? (
              <Icon
                name="Circle-health"
                color="selectedActive"
                // @ts-expect-error - FIXME when you are working on it
                transform={{ x: 13, y: 10 }}
                size="xs"
              />
            ) : null}
          </span>
        }
        tooltip={{
          overlay: 'Notification Center',
        }}
      />
      <div {...getMenuProps()}>
        {isOpen && (
          <NotificationMenu>
            <NotificationCenterHeader>
              <Wrap alignItems="baseline">
                <Text color="textSecondary" isEmphazed variant="Large">
                  Notifications
                </Text>
                {isAtLeastOneNotificationUnread && (
                  <TextBadge text={`${notifications.filter((n) => !n.readOn).length}`} variant="selectedActive" />
                )}
              </Wrap>
            </NotificationCenterHeader>
            {notifications.length === 0 && (
              <Box m={spacing.r16}>
                <Wrap alignItems="center">
                  <SleepingNotificationBell />
                  <Text color="textSecondary">You have no new notifications at the moment.</Text>
                </Wrap>
              </Box>
            )}
            {notifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                $isHighlighted={highlightedIndex === index}
                $isRead={!!notification.readOn}
                {...getItemProps({
                  item: notification,
                  index,
                })}
              >
                <Icon
                  color={
                    notification.severity === 'critical'
                      ? 'statusCritical'
                      : notification.severity === 'warning'
                        ? 'statusWarning'
                        : 'infoPrimary'
                  }
                  name={
                    notification.severity === 'critical'
                      ? 'Times-circle'
                      : notification.severity === 'warning'
                        ? 'Exclamation-circle'
                        : 'Dot-circle'
                  }
                />

                <Stack
                  direction="vertical"
                  flex={1}
                  // @ts-expect-error - FIXME when you are working on it
                  gap="0.1rem"
                  // min-width: 0 is what lets the title and description ellipsize
                  // instead of pushing the unread mark out of the row.
                  style={{ minWidth: 0 }}
                >
                  <Wrap
                    style={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text color="textPrimary" isEmphazed={!notification.readOn}>
                      {notification.title}
                    </Text>
                    <Text variant="Smaller" color="textSecondary">
                      <FormattedDateTime value={notification.createdOn} format="relative" />
                    </Text>
                  </Wrap>

                  <ConstrainedText
                    lineClamp={2}
                    text={
                      <Text color="textSecondary" isEmphazed={!notification.readOn}>
                        {notification.description}
                      </Text>
                    }
                  />
                </Stack>

                <Box style={{ opacity: !notification.readOn ? 1 : 0 }}>
                  <Icon
                    name="Circle-health"
                    color="selectedActive"
                    size="xs"
                    aria-hidden={!notification.readOn ? 'false' : 'true'}
                    aria-label="unread notification mark"
                  />
                </Box>
              </NotificationItem>
            ))}
          </NotificationMenu>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
