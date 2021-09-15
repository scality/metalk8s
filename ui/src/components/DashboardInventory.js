//@flow

import React from 'react';
import { useQuery } from 'react-query';
import styled, { css } from 'styled-components';
import Card from '@scality/core-ui/dist/components/card/Card.component';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import {
  spacing,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';

import { useIntl } from 'react-intl';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import { STATUS_WARNING, STATUS_CRITICAL } from '../constants';
import { useTypedSelector } from '../hooks';
import {
  getNodesCountQuery,
  getVolumesCountQuery,
} from '../services/platformlibrary/k8s.js';
import {
  useAlertLibrary,
  useHighestSeverityAlerts,
  highestAlertToStatus,
} from '../containers/AlertProvider';

const InventoryContainer = styled.div`
  padding: 0px ${spacing.sp2};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const CardsWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  font-size: ${fontSize.base};
  margin: ${spacing.sp4} 0px;
`;

const InventoryIcon = styled.i`
  font-size: ${fontSize.larger};
  margin-right: ${spacing.sp4};
  ${(props) => {
    switch (props.status) {
      case STATUS_WARNING:
        return css`
          color: ${props.theme.statusWarning};
        `;
      case STATUS_CRITICAL:
        return css`
          color: ${props.theme.statusCritical};
        `;

      default:
        return css`
          color: ${props.theme.statusHealthy};
        `;
    }
  }}
`;

const InventoryValue = styled.span`
  font-size: ${fontSize.larger};
  font-weight: ${fontWeight.bold};
`;

const DashboardInventory = () => {
  const intl = useIntl();
  const alertsLibrary = useAlertLibrary();
  const nodesAlerts = useHighestSeverityAlerts(
    alertsLibrary.getNodesAlertSelectors(),
  );
  const nodesStatus = highestAlertToStatus(nodesAlerts);
  const volumesAlerts = useHighestSeverityAlerts(
    alertsLibrary.getVolumesAlertSelectors(),
  );
  const volumesStatus = highestAlertToStatus(volumesAlerts);
  const token = useTypedSelector((state) => state.oidc?.user?.token);
  const config = useTypedSelector((state) => state.config.api?.url);

  const { data: volumesCount } = useQuery(
    getVolumesCountQuery(config || '', token),
  );

  const { data: nodesCount } = useQuery(
    getNodesCountQuery(config || '', token),
  );

  return (
    <InventoryContainer>
      <PageSubtitle aria-label="inventory">
        {intl.formatMessage({ id: 'inventory' })}
      </PageSubtitle>
      <CardsWrapper>
        {(nodesCount || nodesCount === 0) && nodesStatus ? (
          <Card
            width="46%"
            headerBackgroundColor="backgroundLevel1"
            bodyBackgroundColor="backgroundLevel2"
            aria-label="nodes"
          >
            <Card.Header>
              <div>{intl.formatMessage({ id: 'nodes' })}</div>
            </Card.Header>
            <Card.BodyContainer>
              <Card.Body>
                <InventoryIcon
                  className="fas fa-server"
                  status={nodesStatus}
                  aria-label={nodesStatus}
                />
                <InventoryValue aria-label={`${nodesCount} nodes`}>
                  {nodesCount}
                </InventoryValue>
              </Card.Body>
            </Card.BodyContainer>
          </Card>
        ) : (
          <Loader aria-label="loading" />
        )}
        {(volumesCount || volumesCount === 0) && volumesStatus ? (
          <Card
            width="46%"
            headerBackgroundColor="backgroundLevel1"
            bodyBackgroundColor="backgroundLevel2"
            aria-label="volumes"
          >
            <Card.Header>
              <div>{intl.formatMessage({ id: 'volumes' })}</div>
            </Card.Header>
            <Card.BodyContainer>
              <Card.Body>
                <InventoryIcon
                  className="fas fa-hdd"
                  status={volumesStatus}
                  aria-label={volumesStatus}
                />
                <InventoryValue aria-label={`${volumesCount} volumes`}>
                  {volumesCount}
                </InventoryValue>
              </Card.Body>
            </Card.BodyContainer>
          </Card>
        ) : (
          <Loader aria-label="loading" />
        )}
      </CardsWrapper>
    </InventoryContainer>
  );
};

export default DashboardInventory;
