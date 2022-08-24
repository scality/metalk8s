import React from 'react';
import { useIntl } from 'react-intl';
import { Chips, ConstrainedText } from '@scality/core-ui';
import { Box, Table } from '@scality/core-ui/dist/next';
import { NoResult } from '@scality/core-ui/dist/components/tablev2/Tablestyle';
import ActiveAlertsFilter from './ActiveAlertsFilters';
import { useURLQuery, formatDateToMid1 } from '../services/utils';
import { STATUS_WARNING, STATUS_CRITICAL } from '../constants';

const NodePageAlertsTab = (props) => {
  const { alertsNode } = props;
  const intl = useIntl();
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
    alertsNode
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
      cellStyle: { width: '13rem' },
    },
    {
      Header: 'Severity',
      accessor: 'severity',
      cellStyle: { width: '4.5rem' },
      Cell: ({ value }) => {
        return <Chips text={value} variant={value} />;
      },
    },
    {
      Header: 'Description',
      accessor: 'alertDescription',
      cellStyle: { flex: 1, paddingLeft: '1rem' },
      Cell: ({ value }) => {
        return <ConstrainedText lineClamp={2} text={value} />;
      },
    },
    {
      Header: 'Active since',
      accessor: 'activeSince',
      cellStyle: { textAlign: 'center', width: '7rem' },
      Cell: ({ value }) => {
        return <span>{formatDateToMid1(value)}</span>;
      },
    },
  ];

  return (
    <Box display="flex" flexDirection="column" hgeight="100%" margin="1rem">
      <Box display="flex" justifyContent={'flex-end'}>
        {alertsNode?.length !== 0 && <ActiveAlertsFilter />}
      </Box>
      <Box pt="1rem" flex={1}>
        <Table columns={columns} data={activeAlertListData}>
          <Table.SingleSelectableContent
            rowHeight="h48"
            separationLineVariant="backgroundLevel2"
            backgroundVariant="backgroundLevel4"
            children={(Rows) => {
              if (alertsNode?.length === 0)
                return (
                  <NoResult>
                    {intl.formatMessage({ id: 'no_active_alerts' })}
                  </NoResult>
                );
              return <>{Rows}</>;
            }}
          />
        </Table>
      </Box>
    </Box>
  );
};

export default NodePageAlertsTab;
