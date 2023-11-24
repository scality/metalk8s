import React from 'react';
import { Chips, ConstrainedText } from '@scality/core-ui';
import { Box, Table } from '@scality/core-ui/dist/next';
import ActiveAlertsFilter from './ActiveAlertsFilters';
import { useURLQuery, formatDateToMid1 } from '../services/utils';
import { STATUS_WARNING, STATUS_CRITICAL } from '../constants';
import { Alert } from '../services/alertUtils';

const AlertsTab = ({
  alerts,
  children,
}: {
  alerts: Alert[];
  children?: (rows: JSX.Element) => JSX.Element;
}) => {
  const query = useURLQuery();
  // Retrieve the severity filter from URL.
  // Filter more than one severity, the URL should be:
  // `/nodes/<node-name>/alerts?severity=warning&severity=critical`
  let alertSeverity = query.getAll('severity');

  // Display all the alerts when there is no severity filter
  if (alertSeverity?.length === 0) {
    alertSeverity.push(STATUS_WARNING, STATUS_CRITICAL);
  }

  const activeAlertListData =
    alerts
      ?.map((alert) => {
        return {
          name: alert.labels.alertname,
          severity: alert.labels.severity,
          alertDescription: alert.description || alert.summary,
          activeSince: alert.startsAt,
        };
      })
      ?.filter((alert) => alertSeverity.includes(alert.severity)) ?? [];
  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
      cellStyle: {
        width: '13rem',
      },
    },
    {
      Header: 'Severity',
      accessor: 'severity',
      cellStyle: {
        width: '4.5rem',
      },
      Cell: ({ value }) => {
        return (
          <Chips
            text={value}
            variant={value === 'warning' ? 'statusWarning' : 'statusCritical'}
          />
        );
      },
    },
    {
      Header: 'Description',
      accessor: 'alertDescription',
      cellStyle: {
        flex: 1,
        paddingLeft: '1rem',
      },
      Cell: ({ value }) => {
        return <ConstrainedText lineClamp={2} text={value} />;
      },
    },
    {
      Header: 'Active since',
      accessor: 'activeSince',
      cellStyle: {
        textAlign: 'right',
        width: '7rem',
      },
      Cell: ({ value }) => {
        return <span>{formatDateToMid1(value)}</span>;
      },
    },
  ];
  return (
    <Box display="flex" flexDirection="column" height="100%" margin="1rem">
      <Box display="flex" justifyContent="flex-end">
        <Box display="flex" width="150px">
          <ActiveAlertsFilter />
        </Box>
      </Box>
      <Box pt="1rem" flex={1}>
        <Table columns={columns} data={activeAlertListData}>
          <Table.SingleSelectableContent
            rowHeight="h48"
            separationLineVariant="backgroundLevel2"
            backgroundVariant="backgroundLevel4"
            children={children}
          />
        </Table>
      </Box>
    </Box>
  );
};

export default AlertsTab;
