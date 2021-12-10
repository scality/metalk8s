import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import isEqual from 'lodash.isequal';
import { Tooltip } from '@scality/core-ui';
import { Table } from '@scality/core-ui/dist/next';

import { padding, spacing } from '@scality/core-ui/dist/style/theme';
import { NodeTab } from './style/CommonLayoutStyle';
import { TooltipContent } from './TableRow';

import {
  STATUS_RUNNING,
  STATUS_PENDING,
  STATUS_FAILED,
  STATUS_UNKNOWN,
  GRAFANA_DASHBOARDS,
} from '../constants';
import { useIntl } from 'react-intl';

const PodTableContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: ${padding.large};
  height: calc(100% - ${padding.large} - ${padding.large});
  width: calc(100% - ${padding.large} - ${padding.large});
`;

// Color specification:
// Pod Running + All Containers are running => Green
// Pod Running + At least one container is running => Orange
// Pod Pending => Orange
// Pod Succeeded => Green
// Pod Failed => Red
// Pod Unknown => Red
const StatusText = styled.div`
  color: ${(props) => {
    const { status, numContainer, numContainerRunning } = props;
    if (status === STATUS_RUNNING && numContainer === numContainerRunning) {
      return props.theme.statusHealthy;
    } else if (status === STATUS_RUNNING || status === STATUS_PENDING) {
      return props.theme.statusWarning;
    } else if (status === STATUS_FAILED || status === STATUS_UNKNOWN) {
      return props.theme.statusCritical;
    }
  }}};
`;

const ExternalLink = styled.a`
  color: ${(props) => props.theme.textSecondary};
`;

const NodePagePodsTab = React.memo((props) => {
  const { pods } = props;
  const config = useSelector((state) => state.config);
  const intl = useIntl();
  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        cellStyle: {
          width: '100%',
          maxWidth: '20rem',
          minWidth: '5rem',
          marginRight: spacing.sp8,
        },
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: {
          maxWidth: '7rem',
          marginRight: spacing.sp8,
        },
        sortType: (rowa, rowb) => {
          const {
            values: { status: statusA },
          } = rowa;
          const {
            values: { status: statusB },
          } = rowb;
          const valueA =
            statusA.status + statusA.numContainer + statusA.numContainerRunning;
          const valueB =
            statusB.status + statusB.numContainer + statusB.numContainerRunning;

          return valueA.localeCompare(valueB);
        },
        Cell: (cellProps) => {
          const { status, numContainer, numContainerRunning } = cellProps.value;
          return status === STATUS_RUNNING ? (
            <StatusText
              status={status}
              numContainer={numContainer}
              numContainerRunning={numContainerRunning}
            >
              {`${status} (${numContainerRunning}/${numContainer})`}
            </StatusText>
          ) : (
            <StatusText status={status}>{status}</StatusText>
          );
        },
      },
      {
        Header: 'Age',
        accessor: 'age',
        cellStyle: {
          maxWidth: '5rem',
          marginRight: spacing.sp8,
        },
      },
      {
        Header: 'Namespace',
        accessor: 'namespace',
        cellStyle: {
          maxWidth: '7rem',
          minWidth: '5rem',
          marginRight: spacing.sp8,
        },
      },
      {
        Header: 'Logs',
        accessor: 'log',
        cellStyle: {
          minWidth: '3rem',
          textAlign: 'center',
          width: spacing.sp40,
        },
        Cell: ({ value }) => {
          return (
            <Tooltip
              overlay={
                <TooltipContent>
                  {intl.formatMessage({ id: 'advanced_monitoring' })}
                </TooltipContent>
              }
            >
              <ExternalLink
                href={`${config.api.url_grafana}/d/${GRAFANA_DASHBOARDS.logs}?orgId=1&var-logs=Loki&var-logmetrics=Prometheus&var-metrics=Prometheus&var-podlogs=.*&var-systemlogs=.%2B&var-deployment=calico-kube-controllers&var-pod=${value}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-chart-line" />
              </ExternalLink>
            </Tooltip>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config],
  );
  return (
    <NodeTab>
      <PodTableContainer>
        <Table columns={columns} data={pods} defaultSortingKey={'status'}>
          <Table.SingleSelectableContent
            rowHeight="h48"
            separationLineVariant="backgroundLevel3"
            backgroundVariant="backgroundLevel1"
          />
        </Table>
      </PodTableContainer>
    </NodeTab>
  );
}, isEqual);

export default NodePagePodsTab;
