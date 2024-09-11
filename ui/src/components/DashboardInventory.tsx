import { Card, Icon, Loader, spacing, StatusWrapper } from '@scality/core-ui';
import { fontSize, fontWeight } from '@scality/core-ui/dist/style/theme';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';
import { STATUS_CRITICAL, STATUS_WARNING } from '../constants';
import {
  highestAlertToStatus,
  useAlertLibrary,
  useHighestSeverityAlerts,
} from '../containers/AlertProvider';
import { useAuth } from '../containers/PrivateRoute';
import { useTypedSelector } from '../hooks';
import {
  getNodesCountQuery,
  getVolumesCountQuery,
} from '../services/platformlibrary/k8s';

const InventoryContainer = styled.div`
  padding: 0px ${spacing.r2};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;
const CardsWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  font-size: ${fontSize.base};
  margin: ${spacing.r4} 0px;
`;
const InventoryIcon = styled.i`
  font-size: ${fontSize.larger};
`;
const InventoryValue = styled.span`
  font-size: ${fontSize.larger};
  font-weight: ${fontWeight.bold};
`;

const getStatusColor = (status) => {
  switch (status) {
    case STATUS_WARNING:
      return 'statusWarning';

    case STATUS_CRITICAL:
      return 'statusCritical';

    default:
      return 'statusHealthy';
  }
};

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
  const { getToken } = useAuth();
  const config = useTypedSelector((state) => state.config.api?.url);
  const { data: volumesCount } = useQuery(
    // @ts-expect-error - FIXME when you are working on it
    getVolumesCountQuery(config || '', getToken),
  );
  const { data: nodesCount } = useQuery(
    // @ts-expect-error - FIXME when you are working on it
    getNodesCountQuery(config || '', getToken),
  );
  const history = useHistory();
  return (
    <InventoryContainer>
      <PageSubtitle aria-label="inventory">
        {intl.formatMessage({
          id: 'inventory',
        })}
      </PageSubtitle>
      <CardsWrapper>
        {(nodesCount || nodesCount === 0) && nodesStatus ? (
          <Card
            width="46%"
            aria-label="nodes"
            onClick={() => {
              history.push('/nodes');
            }}
          >
            <Card.Header>
              <div>
                {intl.formatMessage({
                  id: 'nodes',
                })}
              </div>
            </Card.Header>
            <Card.BodyContainer>
              <Card.Body>
                <InventoryIcon>
                  <StatusWrapper status={nodesStatus}>
                    <Icon
                      name="Node-backend"
                      color={getStatusColor(nodesStatus)}
                      ariaLabel={nodesStatus}
                    />
                  </StatusWrapper>
                </InventoryIcon>
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
            aria-label="volumes"
            onClick={() => {
              history.push('/volumes');
            }}
          >
            <Card.Header>
              <div>
                {intl.formatMessage({
                  id: 'volumes',
                })}
              </div>
            </Card.Header>
            <Card.BodyContainer>
              <Card.Body>
                <InventoryIcon>
                  <StatusWrapper status={volumesStatus}>
                    <Icon
                      name="Volume-backend"
                      color={getStatusColor(volumesStatus)}
                      ariaLabel={volumesStatus}
                    />
                  </StatusWrapper>
                </InventoryIcon>
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
