import React, { useCallback } from 'react';
import { useHistory } from 'react-router';
import { useLocation, useRouteMatch } from 'react-router-dom';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import {
  ConstrainedText,
  Icon,
  Stack,
  Text,
  Wrap,
  spacing,
} from '@scality/core-ui';
import { Box, Button, Table } from '@scality/core-ui/dist/next';
import { useURLQuery } from '../services/utils';
import CircleStatus from './CircleStatus';
const StatusText = styled.div`
  color: ${(props) => {
    return props.color;
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
          width: 'unset',
          flex: 0.5,
        },
        Cell: ({ value }) => {
          return <CircleStatus status={value.health} />;
        },
      },
      {
        Header: 'Description',
        accessor: 'name',
        cellStyle: {
          textAlign: 'left',
          minWidth: '4rem',
          width: 'unset',
          flex: 2,
        },
        Cell: ({ value }) => {
          const { name, controlPlaneIP, workloadPlaneIP } = value;
          return (
            <>
              <ConstrainedText
                text={
                  <Text
                    data-cy="node_table_name_cell"
                    variant="Basic"
                    isEmphazed
                  >
                    {name}
                  </Text>
                }
              ></ConstrainedText>

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
          flex: 1,
        },
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: {
          textAlign: 'center',
          minWidth: '4rem',
          width: 'unset',
          flex: 0.5,
        },
        Cell: (cellProps) => {
          const { statusTextColor, computedStatus } = cellProps.value;
          return computedStatus.map((status) => {
            return (
              <StatusText key={status} color={statusTextColor}>
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
    <Table
      columns={columns}
      data={nodeTableData}
      defaultSortingKey={'health'}
      entityName={{
        en: {
          singular: 'node',
          plural: 'nodes',
        },
      }}
      // @ts-expect-error - FIXME when you are working on it
      getRowId={(row) => row.name.name}
    >
      <Wrap padding={spacing.r16}>
        <Table.SearchWithQueryParams />
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
      </Wrap>
      <Table.SingleSelectableContent
        rowHeight="h64"
        separationLineVariant="backgroundLevel1"
        selectedId={selectedNodeName}
        onRowSelected={onClickRow}
      />
    </Table>
  );
};

export default NodeListTable;
