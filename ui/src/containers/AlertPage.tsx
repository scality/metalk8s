import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  StatusWrapper,
  ConstrainedText,
  TextBadge,
  AppContainer,
  Stack,
  GlobalHealthBar,
} from '@scality/core-ui';
import {
  Button,
  HealthSelector,
  SyncedCursorCharts,
  Table,
  Tabs,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { fontSize, spacing } from '@scality/core-ui/dist/style/theme';
import { useAlerts } from './AlertProvider';
import StatusIcon from '../components/StatusIcon';
import { STATUS_WARNING, STATUS_CRITICAL, STATUS_HEALTH } from '../constants';
import { compareHealth, formatDateToMid1 } from '../services/utils';
import CircleStatus from '../components/CircleStatus';
import { useIntl } from 'react-intl';
import isEqual from 'lodash.isequal';
import { useHistory, useLocation, useRouteMatch } from 'react-router';
import { useUserAccessRight } from '../hooks';
import { useQuery } from 'react-query';
import { getFormattedLokiAlert } from '../services/loki/api';
import { useStartingTimeStamp } from './StartTimeProvider';
import { getClusterAlertSegmentQuery } from '../services/platformlibrary/metrics';
import TimespanSelector from './TimespanSelector';

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
  font-size: ${
    // @ts-expect-error - FIXME when you are working on it
    fontSize.bases
  };
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
          {/* @ts-expect-error - FIXME when you are working on it */}
          <TextBadge variant="infoPrimary" text={activeAlerts} />
          <SeperationLine />
        </SecondaryTitle>

        <TertiaryTitle>
          <div>
            Critical
            {/* @ts-expect-error - FIXME when you are working on it */}
            <TextBadge variant="statusCritical" text={critical} />
          </div>
          <div>
            Warning
            {/* @ts-expect-error - FIXME when you are working on it */}
            <TextBadge variant="statusWarning" text={warning} />
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
    const { search } = useLocation();
    const history = useHistory();
    const queryParams = new URLSearchParams(search);
    return (
      <Table
        columns={columns}
        data={data.filter((alert) => {
          return (
            !queryParams.has('health') ||
            queryParams.get('health') === 'all' ||
            queryParams.get('health') === alert.severity
          );
        })}
        defaultSortingKey={DEFAULT_SORTING_KEY}
        sortTypes={sortTypes}
      >
        <Stack
          style={{
            margin: `${spacing.sp16} 0`,
          }}
        >
          <Table.SearchWithQueryParams
            displayedName={{
              singular: 'alert',
              plural: 'alerts',
            }}
          />
          <HealthSelector
            id="health_selector"
            onChange={(newValue) => {
              queryParams.set('health', newValue);
              history.push({
                search: queryParams.toString(),
              });
            }}
            value={queryParams.get('health') || 'all'}
          />
        </Stack>
        <Table.SingleSelectableContent
          rowHeight="h48"
          separationLineVariant="backgroundLevel1"
          backgroundVariant="backgroundLevel3"
          customItemKey={(index, data) => {
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
export const CustomTabs = styled(Tabs)`
  display: flex;
  flex: 1;
  .sc-tabs-item-content {
    overflow-y: auto;
    padding: ${spacing.sp16};
  }
`;
export default function AlertPage() {
  const alerts = useAlerts({});
  const leafAlerts = useMemo(
    () => alerts?.alerts.filter((alert) => !alert.labels.children) || [],
    [JSON.stringify(alerts?.alerts)],
  );
  console.log('leafAlerts', leafAlerts);
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
          width: '100px',
        },
        sortType: 'severity',
        Cell: (cell) => <CircleStatus status={cell.value} />,
      },
      {
        Header: 'Name',
        accessor: 'labels.alertname',
        cellStyle: {
          flexGrow: '2',
        },
        sortType: 'name',
      },
      {
        Header: 'Description',
        cellStyle: {
          flexGrow: '12',
          margin: `0 ${spacing.sp8}`,
        },
        accessor: (row) => row.description || row.summary,
        Cell: (cell) => <ConstrainedText lineClamp={2} text={cell.value} />,
      },
      {
        Header: 'Active since',
        accessor: 'startsAt',
        cellStyle: {
          flexGrow: '1',
          textAlign: 'right',
          marginRight: spacing.sp12,
        },
        Cell: (cell) => <span>{formatDateToMid1(cell.value)}</span>,
      },
    ],
    [],
  );
  const { url } = useRouteMatch();
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const queryOptions = Object.fromEntries(queryParams.entries());
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
        <CustomTabs>
          <Tabs.Tab
            label="Active"
            path={`${url}`}
            query={{ ...queryOptions, tab: '' }}
          >
            <ActiveAlertTab data={leafAlerts} columns={columns} />
          </Tabs.Tab>
          <Tabs.Tab
            label="History"
            path={`${url}`}
            query={{ ...queryOptions, tab: 'history' }}
          >
            <SyncedCursorCharts>
              <AlertHistoryPOC />
            </SyncedCursorCharts>
          </Tabs.Tab>
        </CustomTabs>
      </AppContainer.MainContent>
    </AppContainer>
  );
}

type AlertSegment = {
  startsAt: string;
  endsAt: string;
  severity: 'unavailable' | 'critical' | 'warning' | 'healthy';
  description: string;
};

function AlertHistoryBar({ alertSegments }: { alertSegments: AlertSegment[] }) {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  return (
    <GlobalHealthBar
      id={'platform_globalhealth'}
      alerts={alertSegments}
      start={startingTimeISO}
      end={currentTimeISO}
    />
  );
}

function useAlertHistory() {
  const { duration } = useMetricsTimeSpan();
  const { data: alertSegments, status: clusterHealthHistoryStatus } = useQuery(
    getClusterAlertSegmentQuery(duration),
  ) as
    | {
        data?: AlertSegment[];
        status: 'idle' | 'loading' | 'error';
      }
    | {
        data: AlertSegment[];
        status: 'success';
      };

  const now = new Date().getTime();
  const frequency = 60;
  const endTime = now - (now % (frequency * 1000)); //round minute of current time to make sure we have the same points in the result

  const startingTimeISO = new Date(
    (endTime / 1000 - duration) * 1000,
  ).toISOString();
  const currentTimeISO = new Date(endTime).toISOString();
  const { data, status } = useQuery({
    queryKey: ['alertHistory', duration],
    queryFn: () => {
      return getFormattedLokiAlert(startingTimeISO, currentTimeISO);
    },
  });

  //Sample data below
  //[
  //   {
  //     "id": "12ee0811c74d97a5",
  //     "summary": "update-bucket-capacity-info cronjob takes too long to finish",
  //     "description": "Job artesca-data-ops-update-bucket-capacity-info is taking more than 240s to complete.\nThis may cause bucket capacity to be out of date and Veeam SOSAPI avalability as risk.\n",
  //     "startsAt": "2023-10-11T15:52:09.119Z",
  //     "endsAt": "2023-10-11T15:52:39.119Z",
  //     "severity": "warning",
  //     "documentationUrl": "",
  //     "labels": {
  //         "alertname": "artesca-data-ops-alerting-s3utils-UpdateBucketCapacityJobTakingTooLong",
  //         "job_name": "artesca-data-ops-update-bucket-capacity-info-28283988",
  //         "prometheus": "metalk8s-monitoring/prometheus-operator-prometheus",
  //         "severity": "warning",
  //         "selectors": []
  //     },
  //     "originalAlert": {
  //         "status": "resolved",
  //         "labels": {
  //             "alertname": "artesca-data-ops-alerting-s3utils-UpdateBucketCapacityJobTakingTooLong",
  //             "job_name": "artesca-data-ops-update-bucket-capacity-info-28283988",
  //             "prometheus": "metalk8s-monitoring/prometheus-operator-prometheus",
  //             "severity": "warning"
  //         },
  //         "annotations": {
  //             "description": "Job artesca-data-ops-update-bucket-capacity-info is taking more than 240s to complete.\nThis may cause bucket capacity to be out of date and Veeam SOSAPI avalability as risk.\n",
  //             "namespace": "zenko",
  //             "summary": "update-bucket-capacity-info cronjob takes too long to finish",
  //             "zenko_component": "s3utils",
  //             "zenko_instance": "artesca-data"
  //         },
  //         "startsAt": "2023-10-11T15:52:09.119Z",
  //         "endsAt": "2023-10-11T15:52:39.119Z",
  //         "generatorURL": "http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=time%28%29+-+%28sum+by+%28job_name%29+%28kube_job_status_failed%7Bjob_name%3D~%22artesca-data-ops-update-bucket-capacity-info.%2A%22%7D%29+%3E+sum+by+%28job_name%29+%28kube_job_status_completion_time%7Bjob_name%3D~%22artesca-data-ops-update-bucket-capacity-info.%2A%22%7D%29+or+sum+by+%28job_name%29+%28kube_job_status_completion_time%7Bjob_name%3D~%22artesca-data-ops-update-bucket-capacity-info.%2A%22%7D%29%29+%3E+240&g0.tab=1",
  //         "fingerprint": "12ee0811c74d97a5"
  //     }
  // },
  // ...
  //]
  //When endsAt is null, set endsAt to next startsAt of following unavailable segment from alertSegments or current time if none is found

  if (clusterHealthHistoryStatus === 'success') {
    const alertSegmentsByName =
      data?.reduce((agg, alert) => {
        if (alert.endsAt === null) {
          const nextUnavailableSegment = alertSegments.find(
            (segment) =>
              segment.startsAt > alert.startsAt &&
              segment.severity === 'unavailable',
          );
          alert.endsAt = nextUnavailableSegment?.startsAt || currentTimeISO;
        }
        return {
          ...agg,
          [alert.labels.alertname]: [
            ...(agg[alert.labels.alertname] || []),
            {
              startsAt: alert.startsAt,
              endsAt: alert.endsAt,
              severity: alert.severity as AlertSegment['severity'],
              description: alert.description,
            },
          ],
        };
      }, {} as Record<string, AlertSegment[]>) ||
      ({} as Record<string, AlertSegment[]>);
    return {
      alertSegments: Object.entries(alertSegmentsByName).map(
        ([name, segments]) => ({ name, segments }),
      ),
      status: status,
    };
  }
  return {
    alertSegments: [] as { name: string; segments: AlertSegment[] }[],
    status: status,
  };
}

function AlertHistoryPOC() {
  const { search } = useLocation();
  const history = useHistory();
  const queryParams = new URLSearchParams(search);
  const { alertSegments, status } = useAlertHistory();

  return (
    <Table
      data={alertSegments}
      columns={[
        {
          Header: 'Alert',
          accessor: 'name',
          cellStyle: {
            flexGrow: '4',
          },
        },
        {
          Header: 'Active on',
          accessor: 'segments',
          cellStyle: {
            flexGrow: '8',
            margin: `0 ${spacing.sp8}`,
          },
          Cell: (cell) => <AlertHistoryBar alertSegments={cell.value} />,
        },
      ]}
    >
      <Stack
        style={{
          margin: `${spacing.sp16} 0`,
        }}
      >
        <Table.SearchWithQueryParams
          displayedName={{
            singular: 'alert',
            plural: 'alerts',
          }}
        />
        <HealthSelector
          id="health_selector"
          onChange={(newValue) => {
            queryParams.set('health', newValue);
            history.push({
              search: queryParams.toString(),
            });
          }}
          value={queryParams.get('health') || 'all'}
        />
        <TimespanSelector />
      </Stack>
      <Table.SingleSelectableContent
        rowHeight="h48"
        separationLineVariant="backgroundLevel1"
        backgroundVariant="backgroundLevel3"
        isLoadingMoreItems={status === 'loading'}
      />
    </Table>
  );
}
