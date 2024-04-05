import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import {
  FormattedDateTime,
  Tooltip,
  StatusText,
  Icon,
  spacing,
} from '@scality/core-ui';
import { fontSize, fontWeight } from '@scality/core-ui/dist/style/theme';
import type { Alert } from '../services/alertUtils';
import type { Status } from '../containers/AlertProvider';
import CircleStatus from './CircleStatus';
import { STATUS_HEALTH } from '../constants';
import {
  useDiscoveredViews,
  useLinkOpener,
} from '../containers/ConfigProvider';
import { useHistory } from 'react-router';
const ServiceItemLabelWrapper = styled.div`
  display: flex;
  align-items: baseline;
`;
const ServiceItemLabel = styled.div`
  margin-left: ${spacing.r8};
`;
const ServiceItemElement = styled.div`
  padding: ${spacing.r4};
`;
const ClickableServiceItemElement = styled(ServiceItemElement)`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;

  :hover {
    background-color: ${(props) => props.theme.highlight};
  }
`;
const NonHealthyServiceItemElement = styled.div`
  cursor: pointer;
  width: 100%;
  display: flex;
  flex-direction: column;

  a {
    text-decoration: none;
    color: inherit;
    width: 100%;
    display: flex;
    align-items: center;
  }
`;
const NonHealthyPopUp = styled.div`
  display: flex;
  flex-direction: column;
  font-size: ${fontSize.base};

  label {
    width: 25%;
    margin-right: ${spacing.r8};
    color: ${(props) => props.theme.textSecondary};
    text-align: right;
  }
`;
const NonHealthyPopUpTitle = styled.div`
  font-weight: ${fontWeight.bold};
  align-self: center;
`;
const NonHealthyPopUpItem = styled.div`
  width: 100%;
  display: flex;
  margin: ${spacing.r4} ${spacing.r14};
  align-items: center;
`;

const HealthItem = ({
  label,
  status,
  alerts,
  showArrow = true,
}: {
  label: string;
  status: Status;
  alerts: Alert[];
  showArrow?: boolean;
}) => {
  const intl = useIntl();
  const { openLink } = useLinkOpener();
  const history = useHistory();
  const discoveredViews = useDiscoveredViews();
  const alertView = discoveredViews.find(
    (view) => view.view.path === '/alerts',
  );

  if (!alerts.length && status === STATUS_HEALTH) {
    return (
      <ServiceItemElement aria-label={label}>
        <ServiceItemLabelWrapper>
          <CircleStatus status={status} />
          <ServiceItemLabel>{label}</ServiceItemLabel>
        </ServiceItemLabelWrapper>
      </ServiceItemElement>
    );
  } else {
    return (
      <NonHealthyServiceItemElement>
        <Tooltip // Right placement to avoid Z index issues between left sidebar and tooltip or out of screen tooltip displays
          placement="top"
          overlayStyle={{
            width: '20rem',
          }}
          overlay={
            <NonHealthyPopUp>
              <NonHealthyPopUpTitle>
                {intl.formatMessage({
                  id: 'view_details',
                })}
              </NonHealthyPopUpTitle>
              <NonHealthyPopUpItem>
                <label>
                  {intl.formatMessage({
                    id: 'severity',
                  })}
                </label>
                <StatusText status={status}>{status}</StatusText>
              </NonHealthyPopUpItem>
              {alerts[0] && alerts[0].startsAt && (
                <NonHealthyPopUpItem>
                  <label>
                    {intl.formatMessage({
                      id: 'start',
                    })}
                  </label>
                  <FormattedDateTime
                    value={new Date(alerts[0].startsAt)}
                    format="date-time"
                  />
                </NonHealthyPopUpItem>
              )}
            </NonHealthyPopUp>
          }
        >
          <div
            onClick={() => {
              openLink(alertView);
              history.replace('/alerts');
            }}
            data-testid="alert-link"
          >
            <ClickableServiceItemElement aria-label={label}>
              <ServiceItemLabelWrapper>
                <CircleStatus status={status} />
                <ServiceItemLabel>{label}</ServiceItemLabel>
              </ServiceItemLabelWrapper>
              {showArrow && (
                <Icon
                  name="Angle-right"
                  // @ts-expect-error - FIXME when you are working on it
                  style={{
                    selfAlign: 'flex-end',
                  }}
                />
              )}
            </ClickableServiceItemElement>
          </div>
        </Tooltip>
      </NonHealthyServiceItemElement>
    );
  }
};

export default HealthItem;
