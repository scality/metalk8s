import React, { useCallback } from 'react';
import { useHistory } from 'react-router';
import { useLocation, useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Icon, Stack, Text } from '@scality/core-ui';
import { Box, Button, Table } from '@scality/core-ui/dist/next';
import { useURLQuery } from '../services/utils';
import CircleStatus from './CircleStatus';
const StatusText = styled.div`
  color: ${(props) => {
    // @ts-expect-error - FIXME when you are working on it
    return props.textColor;
  }};
`;

const NodeListTable = ({ nodeTableData }) => {
  const history = useHistory();
  const location = useLocation();
  const query = useURLQuery();
  const intl = useIntl();
  const { path } = useRouteMatch();
  const selectedNodeName =
    history?.location?.pathname?.split('/')?.slice(2)[0] || '';
  const columns = React.useMemo(
    () => [
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: {
          textAlign: 'center',
          width: '5rem',
        },
        Cell: ({ value }) => {
          return <CircleStatus status={value.health} />;
        },
      },
      {
        Header: 'Description',
        accessor: 'name',
        cellStyle: {
          flex: 1,
        },
        Cell: ({ value }) => {
          const { name, controlPlaneIP, workloadPlaneIP } = value;
          return (
            <>
              <Text data-cy="node_table_name_cell" variant="Basic" isEmphazed>
                {value.displayName || name}
              </Text>
              <Stack>
                {controlPlaneIP ? (
                  <Text variant="Smaller" color="textSecondary">
                    CP: {controlPlaneIP}
                  </Text>
                ) : null}
                {workloadPlaneIP ? (
                  <Text variant="Smaller" color="textSecondary">
                    WP: {workloadPlaneIP}
                  </Text>
                ) : null}
              </Stack>
            </>
          );
        },
      },
      {
        Header: 'Roles',
        accessor: 'roles',
        cellStyle: {
          flex: 0.5,
        },
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: {
          textAlign: 'center',
          width: '5rem',
        },
        Cell: (cellProps) => {
          const { statusTextColor, computedStatus } = cellProps.value;
          return computedStatus.map((status) => {
            return (
              // @ts-expect-error - FIXME when you are working on it
              <StatusText key={status} textColor={statusTextColor}>
                {intl.formatMessage({
                  id: `${status}`,
                })}
              </StatusText>
            );
          });
        },
      },
    ],
    [intl],
  );
  // handle the row selection by updating the URL
  const onClickRow = useCallback(
    (row) => {
      const nodeName = row.values.name.name;
      const isTabSelected =
        location.pathname.endsWith('overview') ||
        location.pathname.endsWith('alerts') ||
        location.pathname.endsWith('metrics') ||
        location.pathname.endsWith('volumes') ||
        location.pathname.endsWith('pods') ||
        location.pathname.endsWith('partitions') ||
        location.pathname.endsWith('details');

      if (isTabSelected) {
        const newPath = location.pathname.replace(
          /\/nodes\/[^/]*\//,
          `/nodes/${nodeName}/`,
        );
        history.push({
          pathname: newPath,
          search: query.toString(),
        });
      } else {
        history.push({
          pathname: `${path}/${nodeName}/overview`,
          search: query.toString(),
        });
      }
    },
    [history, location.pathname, path, query],
  );
  return (
    <Box height={'100%'}>
      <Table
        columns={columns}
        data={nodeTableData}
        defaultSortingKey={'health'}
        // @ts-expect-error - FIXME when you are working on it
        getRowId={(row) => row.name.name}
      >
        <Box
          display="flex"
          justifyContent={'space-between'}
          pt={'16px'}
          px={'16px'}
        >
          <Table.SearchWithQueryParams
            displayedName={{
              singular: 'node',
              plural: 'nodes',
            }}
          />
          <Button
            variant="primary"
            label={intl.formatMessage({
              id: 'create_new_node',
            })}
            icon={<Icon name="Create-add" />}
            onClick={() => {
              history.push('/nodes/create');
            }}
            data-cy="create_node_button"
          />
        </Box>
        <Table.SingleSelectableContent
          rowHeight="h64"
          separationLineVariant="backgroundLevel1"
          backgroundVariant="backgroundLevel2"
          selectedId={selectedNodeName}
          onRowSelected={onClickRow}
          children={(Rows) => {
            return <>{Rows}</>;
          }}
        />
      </Table>
    </Box>
  );
};

export default NodeListTable;
