import { ConstrainedText, Icon, Stack, Text, Wrap, spacing } from '@scality/core-ui';
import { Button, Table } from '@scality/core-ui/dist/next';
import React, { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useResolvedPath } from 'react-router';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useTypedSelector } from '../hooks';
import { useURLQuery } from '../services/utils';
import CircleStatus from './CircleStatus';
const StatusText = styled.div<{ $color?: string }>`
  color: ${(props) => {
    return props.$color;
  }};
`;

const NodeListTable = ({ nodeTableData, loading }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useURLQuery();
  const intl = useIntl();
  const path = useResolvedPath('');

  const basename = useTypedSelector((state) => state.config.api?.ui_base_path);

  const selectedNodeName = location?.pathname.split('/')?.slice(2)[1] || '';

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
                  <Text data-cy="node_table_name_cell" variant="Basic" isEmphazed>
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
              <StatusText key={status} $color={statusTextColor}>
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

      const newPath = location.pathname.replace(/\/nodes\/[^/]*\//, `/nodes/${nodeName}/`);
      if (isTabSelected) {
        navigate(`${newPath}?${query.toString()}`);
      } else {
        navigate(`${newPath}/overview?${query.toString()}`);
      }
    },
    [navigate, location.pathname, path, query],
  );
  return (
    <Table
      columns={columns}
      data={nodeTableData}
      status={loading ? 'loading' : 'success'}
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
            navigate(basename + '/nodes/create');
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
