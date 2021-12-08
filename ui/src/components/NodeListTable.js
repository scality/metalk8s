import React, { useCallback } from 'react';
import { useHistory } from 'react-router';
import { useLocation, useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import { SearchInput } from '@scality/core-ui';
import TableV2 from '@scality/core-ui/dist/components/tablev2/Tablev2.component';
import { useURLQuery } from '../services/utils';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import CircleStatus from './CircleStatus';
import { EmptyTable } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { compareHealth } from '../services/utils';
import {
  API_STATUS_READY,
  API_STATUS_NOT_READY,
  API_STATUS_UNKNOWN,
  API_STATUS_DEPLOYING,
} from '../constants';

const NodeListContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: ${padding.base};
  font-family: 'Lato';
  font-size: 1rem;
  background-color: ${(props) => props.theme.backgroundLevel2};
  height: 100%;
`;

const CreateNodeButton = styled(Button)`
  margin-left: ${padding.larger};
`;

const ActionContainer = styled.span`
  display: flex;
  justify-content: space-between;
  padding-bottom: 15px;
`;

const NodeNameText = styled.div`
  font-size: ${fontSize.large};
`;

// To make sure CP and WP stay next to each other, and then stack with responsive change.
const IPs = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
`;

const IPText = styled.span`
  font-size: ${fontSize.smaller};
  padding-right: ${padding.small};
  color: ${(props) => props.theme.textSecondary};
`;

const StatusText = styled.div`
  color: ${(props) => {
    return props.textColor;
  }};
`;

function GlobalFilter({ onFilterChange, value }) {
  const history = useHistory();
  const location = useLocation();
  const intl = useIntl();
  const onChange = (value) => {
    typeof onFilterChange === 'function' && onFilterChange(value);

    const searchParams = new URLSearchParams(location.search);
    const isSearch = searchParams.has('search');
    if (!isSearch) {
      searchParams.append('search', value);
    } else {
      searchParams.set('search', value);
    }
    history.replace(`?${searchParams.toString()}`);
  };

  return (
    <ActionContainer>
      <SearchInput
        value={value || undefined}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={`Search`}
        disableToggle={true}
        data-cy="node_list_search"
      />
      <CreateNodeButton
        variant="primary"
        label={intl.formatMessage({ id: 'create_new_node' })}
        icon={<i className="fas fa-plus" />}
        onClick={() => {
          history.push('/nodes/create');
        }}
        data-cy="create_node_button"
      />
    </ActionContainer>
  );
}

const NodeListTable = React.memo((props) => {
  const { nodeTableData } = props;
  const history = useHistory();
  const location = useLocation();
  const query = useURLQuery();
  const intl = useIntl();
  const { path } = useRouteMatch();
  const querySearch = query.get('search');
  const [globalFilterValue, setValue] = React.useState(querySearch);
  function onFilterChange(value) {
    setValue(value);
  }

  const selectedNodeName =
    history?.location?.pathname?.split('/')?.slice(2)[0] || '';
  const columns = React.useMemo(
    () => [
      {
        Header: 'health',
        accessor: 'health',
        cellStyle: { textAlign: 'center', width: '5rem' },
        Cell: (cellProps) => {
          const { health } = cellProps.value;
          return <CircleStatus status={health} />;
        },
        sortType: 'health',
      },
      {
        Header: 'Name',
        accessor: 'name',
        cellStyle: { paddingLeft: '20px', width: '100%' },
        Cell: (cellProps) => {
          const { name, workloadPlaneIP, controlPlaneIP } = cellProps.value;
          return (
            <>
              <NodeNameText data-cy="node_table_name_cell">{name}</NodeNameText>
              <IPs>
                {controlPlaneIP && <IPText>CP : {controlPlaneIP}</IPText>}
                {workloadPlaneIP && <IPText>WP: {workloadPlaneIP}</IPText>}
              </IPs>
            </>
          );
        },
        sortType: 'name',
      },
      {
        Header: 'Roles',
        accessor: 'roles',
        cellStyle: { width: '30rem' },
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: { textAlign: 'center' },
        Cell: (cellProps) => {
          const { statusTextColor, computedStatus } = cellProps.value;
          return computedStatus.map((status) => {
            return (
              <StatusText key={status} textColor={statusTextColor}>
                {intl.formatMessage({ id: `${status}` })}
              </StatusText>
            );
          });
        },
        sortType: 'status',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // handle the row selection by updating the URL
  const onClickRow = (row) => {
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
  };

  const getRowId = useCallback((row, relativeIndex) => {
    return row.name.name;
  }, []);

  const sortTypes = React.useMemo(() => {
    return {
      health: (row1, row2) => {
        return compareHealth(
          row2?.values?.health?.health,
          row1?.values?.health?.health,
        );
      },
      status: (row1, row2) => {
        const weights = {};
        weights[API_STATUS_READY] = 3;
        weights[API_STATUS_NOT_READY] = 2;
        weights[API_STATUS_DEPLOYING] = 1;
        weights[API_STATUS_UNKNOWN] = 0;

        return (
          weights[row1?.values?.status?.status] -
          weights[row2?.values?.status?.status]
        );
      },
      name: (row1, row2) => {
        const a = row1?.values?.name?.name;
        const b = row2.values?.name?.name;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      },
    };
  }, []);

  return (
    <NodeListContainer>
      <GlobalFilter onFilterChange={onFilterChange} value={globalFilterValue} />
      {nodeTableData && nodeTableData.length > 0 ? (
        <TableV2
          columns={columns}
          data={nodeTableData}
          defaultSortingKey="health"
          getRowId={getRowId}
          sortTypes={sortTypes}
          globalFilter={globalFilterValue}
        >
          <TableV2.SingleSelectableContent
            rowHeight="h64"
            separationLineVariant="backgroundLevel3"
            backgroundVariant="backgroundLevel1"
            selectedId={selectedNodeName}
            onRowSelected={onClickRow}
          />
        </TableV2>
      ) : (
        <EmptyTable>{intl.formatMessage({ id: 'no_node_found' })}</EmptyTable>
      )}
    </NodeListContainer>
  );
});

export default NodeListTable;
