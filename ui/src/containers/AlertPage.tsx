import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  StatusWrapper,
  ConstrainedText,
  TextBadge,
  AppContainer,
  Stack,
  Wrap,
  spacing,
  FormattedDateTime,
} from '@scality/core-ui';
import { Button, Table } from '@scality/core-ui/dist/next';
import { fontSize } from '@scality/core-ui/dist/style/theme';
import { useAlerts } from './AlertProvider';
import StatusIcon from '../components/StatusIcon';
import { STATUS_WARNING, STATUS_CRITICAL, STATUS_HEALTH } from '../constants';
import { compareHealth } from '../services/utils';
import CircleStatus from '../components/CircleStatus';
import { useIntl } from 'react-intl';
import isEqual from 'lodash.isequal';
import { useHistory } from 'react-router';
import { useUserAccessRight } from '../hooks';

const AlertPageHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${(props) => props.theme.backgroundLevel2};
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 250px;
  font-size: ${fontSize.larger};
  font-weight: bold;
  color: ${(props) => props.theme.textPrimary};
`;
const SecondaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${fontSize.base};
  width: 250px;
  color: ${(props) => props.theme.textSecondary};
`;
const TertiaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: ${fontSize.base};
  width: 250px;
  color: ${(props) => props.theme.textPrimary};
`;
const SeperationLine = styled.div`
  width: 250px; // the same width as the container
  height: 37px;
  border-right: 2px solid ${(props) => props.theme.backgroundLevel1};
  position: absolute;
`;
const AlertStatusIcon = styled.div`
  font-size: 2rem;
  border: 1px solid ${(props) => props.theme.infoPrimary};
  border-radius: 50%;
  background: ${(props) => props.theme.backgroundLevel1};
  padding: 0.7rem 0.5rem 0.3rem;
  width: 3rem;
  height: 3rem;
  text-align: center;

  & > span {
    margin: 0;
  }
`;

// only compare the id and severity since the rest of the data can change often (like updateAt, description that display time)
// and we don't want to re-render the whole table every time
const isEqualAlert = (a = [], b = []) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((alertData) =>
    b.find(
      (alert) =>
        alert.id === alertData.id && alert.severity === alertData.severity,
    ),
  );
};

const getAlertStatus = (numbersOfCritical, numbersOfWarning) =>
  numbersOfCritical > 0
    ? STATUS_CRITICAL
    : numbersOfWarning > 0
    ? STATUS_WARNING
    : STATUS_HEALTH;

function AlertPageHeader({
  activeAlerts,
  critical,
  warning,
}: {
  activeAlerts: number;
  critical: number;
  warning: number;
}) {
  const history = useHistory();
  const intl = useIntl();
  const alertStatus = getAlertStatus(critical, warning);

  const { canConfigureEmailNotification } = useUserAccessRight();
  return (
    <AlertPageHeaderContainer>
      <Stack>
        <Title>
          <AlertStatusIcon>
            <StatusWrapper status={alertStatus}>
              <StatusIcon status={alertStatus} name="Alert" />
            </StatusWrapper>
          </AlertStatusIcon>
          <>
            {intl.formatMessage({
              id: 'alerts',
            })}
          </>
          <SeperationLine />
        </Title>

        <SecondaryTitle>
          <>
            {intl.formatMessage({
              id: 'active_alerts',
            })}
          </>
          <TextBadge variant="infoPrimary" text={activeAlerts + ''} />
          <SeperationLine />
        </SecondaryTitle>

        <TertiaryTitle>
          <div>
            Critical
            <TextBadge variant="statusCritical" text={`${critical}`} />
          </div>
          <div>
            Warning
            <TextBadge variant="statusWarning" text={`${warning}`} />
          </div>
        </TertiaryTitle>
      </Stack>
      {canConfigureEmailNotification ? (
        <Button
          label="Email notification configuration"
          variant="secondary"
          onClick={() => {
            history.push('/configure-alerts');
          }}
        />
      ) : null}
    </AlertPageHeaderContainer>
  );
}

const ActiveAlertTab = React.memo(
  // @ts-expect-error - FIXME when you are working on it
  ({ columns, data }) => {
    const sortTypes = React.useMemo(() => {
      return {
        severity: (row1, row2) => {
          return compareHealth(row2?.values?.severity, row1?.values?.severity);
        },
        name: (row1, row2) => {
          const a = row1?.values['labels.alertname'];
          const b = row2.values['labels.alertname'];
          return a.toLowerCase().localeCompare(b.toLowerCase());
        },
        description: (row1, row2) => {
          const a = row1?.values?.description;
          const b = row2.values?.description;
          return a.toLowerCase().localeCompare(b.toLowerCase());
        },
        startsAt: (row1, row2) => {
          const a = row1?.values?.startsAt;
          const b = row2.values?.startsAt;
          // @ts-expect-error - FIXME when you are working on it
          return new Date(a) - new Date(b);
        },
      };
    }, []);
    const DEFAULT_SORTING_KEY = 'severity';
    return (
      <Table
        columns={columns}
        data={data}
        defaultSortingKey={DEFAULT_SORTING_KEY}
        sortTypes={sortTypes}
        entityName={{
          en: {
            singular: 'active alert',
            plural: 'active alerts',
          },
        }}
      >
        <Wrap padding={spacing.r16}>
          <Table.SearchWithQueryParams />
          <p></p>
        </Wrap>
        <Table.SingleSelectableContent
          rowHeight="h48"
          separationLineVariant="backgroundLevel1"
          customItemKey={(index, data) => {
            // @ts-expect-error - FIXME when you are working on it
            return data[index].id;
          }}
        />
      </Table>
    );
  },
  (a, b) => {
    // compare the alert only on id and severity
    // @ts-expect-error - FIXME when you are working on it
    return isEqual(a.columns, b.columns) && isEqualAlert(a.data, b.data);
  },
);
export default function AlertPage() {
  const alerts = useAlerts({});
  const leafAlerts = useMemo(
    () => alerts?.alerts?.filter((alert) => !alert.labels.children) || [],
    [JSON.stringify(alerts?.alerts)],
  );
  const criticalAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'critical',
  );
  const wariningAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'warning',
  );
  const columns = React.useMemo(
    () => [
      {
        Header: 'Severity',
        accessor: 'severity',
        cellStyle: {
          textAlign: 'center',
          flex: 1,
          minWidth: '3rem',
        },
        sortType: 'severity',
        Cell: (cell) => <CircleStatus status={cell.value} />,
      },
      {
        Header: 'Name',
        accessor: 'labels.alertname',
        cellStyle: {
          flex: 2,
          minWidth: '10rem',
        },
        sortType: 'name',
      },
      {
        Header: 'Description',
        cellStyle: {
          flex: 12,
        },
        accessor: (row) => row.description || row.summary,
        Cell: (cell) => <ConstrainedText lineClamp={2} text={cell.value} />,
      },
      {
        Header: 'Active since',
        accessor: 'startsAt',
        cellStyle: {
          flex: 2,
          textAlign: 'right',
          marginRight: spacing.r12,
        },
        Cell: (cell) => (
          <FormattedDateTime
            value={new Date(cell.value)}
            format="date-time-second"
          />
        ),
      },
    ],
    [],
  );
  return (
    <AppContainer>
      <AppContainer.OverallSummary hasTopMargin>
        <AlertPageHeader
          activeAlerts={leafAlerts.length}
          critical={criticalAlerts.length}
          warning={wariningAlerts.length}
        />
      </AppContainer.OverallSummary>
      <AppContainer.MainContent>
        {/* @ts-expect-error - FIXME when you are working on it */}
        <ActiveAlertTab data={leafAlerts} columns={columns} />
      </AppContainer.MainContent>
    </AppContainer>
  );
}
