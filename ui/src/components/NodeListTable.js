import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  useTable,
  useFilters,
  useGlobalFilter,
  useAsyncDebounce,
} from 'react-table';
import { useQuery } from '../services/utils';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import CircleStatus from './CircleStatus';
import { Button } from '@scality/core-ui';
import { intl } from '../translations/IntlGlobalProvider';

const NodeListContainer = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  padding: ${padding.base};
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: ${(props) => props.theme.brand.borderLight};
  background-color: ${(props) => props.theme.brand.primary};
  .sc-progressbarcontainer {
    width: 100%;
  }
  .ReactTable .rt-thead {
    overflow-y: scroll;
  }
  table {
    border-spacing: 0;
    .sc-select-container {
      width: 120px;
      height: 10px;
    }
    tr {
      border-bottom: 5px solid ${(props) => props.theme.brand.primary};
      :last-child {
        td {
          border-bottom: 0;
          font-weight: normal;
        }
      }
    }

    th {
      font-weight: bold;
      height: 56px;
      text-align: left;
      padding: ${padding.smaller};
    }

    td {
      margin: 0;
      padding: 0.5rem;
      text-align: left;

      :last-child {
        border-right: 0;
      }
    }
  }
`;

const HeadRow = styled.tr`
  width: 100%;
  /* To display scroll bar on the table */
  display: table;
  table-layout: fixed;
`;

const CreateNodeButton = styled(Button)`
  margin-left: ${padding.larger};
`;

const TableRow = styled(HeadRow)`
  height: 76px;
  border-radius: 10px;
  &:hover,
  &:focus {
    background-color: ${(props) => props.theme.brand.backgroundBluer};
    border-top: 1px solid ${(props) => props.theme.brand.secondary};
    border-bottom: 1px solid ${(props) => props.theme.brand.secondary};
    outline: none;
    cursor: pointer;
  }

  background-color: ${(props) =>
    props.selectedNodeName === props.row.values.name.name
      ? props.theme.brand.backgroundBluer
      : props.theme.brand.primaryDark1};
`;

// * table body
const Body = styled.tbody`
  /* To display scroll bar on the table */
  display: block;
  height: calc(100vh - 250px);
  overflow: auto;
  overflow-y: scroll;
`;

const Cell = styled.td`
  overflow-wrap: break-word;
`;

const ActionContainer = styled.span`
  display: flex;
`;

const NodeNameText = styled.div`
  font-size: ${fontSize.large};
`;

const IPText = styled.span`
  font-size: ${fontSize.smaller};
  padding-right: ${padding.small};
  color: ${(props) => props.theme.brand.textSecondary};
`;

const StatusText = styled.div`
  color: ${(props) => {
    return props.textColor;
  }};
`;

function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
  theme,
}) {
  const [value, setValue] = React.useState(globalFilter);
  const history = useHistory();
  const location = useLocation();
  const onChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined);

    // update the URL with the content of search
    const searchParams = new URLSearchParams(location.search);
    const isSearch = searchParams.has('search');
    if (!isSearch) {
      searchParams.append('search', value);
    } else {
      searchParams.set('search', value);
    }
    history.push(`?${searchParams.toString()}`);
  }, 500);

  return (
    <ActionContainer>
      <input
        value={value || undefined}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={`Search`}
        style={{
          fontSize: '1.1rem',
          color: theme.brand.textPrimary,
          border: 'solid 1px #3b4045',
          width: '223px',
          height: '27px',
          borderRadius: '4px',
          backgroundColor: theme.brand.primaryDark2,
          fontFamily: 'Lato',
          fontStyle: 'italic',
          opacity: '0.6',
          lineHeight: '1.43',
          letterSpacing: 'normal',
          paddingLeft: '10px',
        }}
      />
      <CreateNodeButton
        size="small"
        variant="secondary"
        text={intl.translate('create_new_node')}
        icon={<i className="fas fa-plus-circle"></i>}
        onClick={() => {
          history.push('/nodes/create');
        }}
        data-cy="create-node-button"
      />
    </ActionContainer>
  );
}

function Table({ columns, data, rowClicked, theme, selectedNodeName }) {
  const query = useQuery();
  const querySearch = query.get('search');

  // Use the state and functions returned from useTable to build your UI
  const defaultColumn = React.useMemo(
    () => ({
      Filter: GlobalFilter,
    }),
    [],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    visibleColumns,
    preGlobalFilteredRows,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      initialState: { globalFilter: querySearch },
    },
    useFilters,
    useGlobalFilter,
  );

  return (
    <>
      <table {...getTableProps()}>
        <thead>
          {/* The first row should be the search bar */}
          <tr>
            <th
              colSpan={visibleColumns.length}
              style={{
                textAlign: 'left',
              }}
            >
              <GlobalFilter
                preGlobalFilteredRows={preGlobalFilteredRows}
                globalFilter={state.globalFilter}
                setGlobalFilter={setGlobalFilter}
                theme={theme}
              />
            </th>
          </tr>
          {headerGroups.map((headerGroup) => {
            return (
              <HeadRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => {
                  const headerStyleProps = column.getHeaderProps({
                    style: column.cellStyle,
                  });
                  return (
                    <th {...headerStyleProps}>{column.render('Header')}</th>
                  );
                })}
              </HeadRow>
            );
          })}
        </thead>
        <Body {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <TableRow
                {...row.getRowProps({ onClick: () => rowClicked(row) })}
                row={row}
                selectedNodeName={selectedNodeName}
              >
                {row.cells.map((cell) => {
                  let cellProps = cell.getCellProps({
                    style: {
                      ...cell.column.cellStyle,
                    },
                  });
                  if (cell.column.Header === 'Name') {
                    return (
                      <Cell {...cellProps}>
                        <NodeNameText>{cell.value.name}</NodeNameText>
                        <div>
                          <IPText>CP: {cell.value.controlPlaneIP}</IPText>
                          <IPText>WP: {cell.value.workloadPlaneIP}</IPText>
                        </div>
                      </Cell>
                    );
                  } else if (cell.value === intl.translate('unknown')) {
                    return (
                      <Cell {...cellProps}>
                        <div>{intl.translate('unknown')}</div>
                      </Cell>
                    );
                  } else {
                    return <Cell {...cellProps}>{cell.render('Cell')}</Cell>;
                  }
                })}
              </TableRow>
            );
          })}
        </Body>
      </table>
    </>
  );
}

const NodeListTable = (props) => {
  const history = useHistory();
  const location = useLocation();
  const { nodeTableData, selectedNodeName } = props;
  const theme = useSelector((state) => state.config.theme);
  const query = useQuery();

  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        cellStyle: { width: '180px' },
      },
      {
        Header: 'Roles',
        accessor: 'roles',
      },
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: { textAlign: 'center', width: '50px' },
        Cell: (cellProps) => {
          return (
            <CircleStatus
              className="fa fa-circle fa-2x"
              status={cellProps.value}
            />
          );
        },
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: { textAlign: 'center', width: '80px' },
        Cell: (cellProps) => {
          const { statusColor, computedStatus } = cellProps.value;
          return computedStatus.map((status) => {
            return (
              <StatusText textColor={statusColor}>
                {intl.translate(`${status}`)}
              </StatusText>
            );
          });
        },
      },
    ],
    [],
  );

  // handle the row selection by updating the URL
  const onClickRow = (row) => {
    const nodeName = row.values.name.name;
    const isTabSelected =
      location.pathname.endsWith('health') ||
      location.pathname.endsWith('alerts') ||
      location.pathname.endsWith('metrics') ||
      location.pathname.endsWith('volumes') ||
      location.pathname.endsWith('pods');

    if (isTabSelected) {
      const newPath = location.pathname.replace(
        /\/newNodes\/[^/]*\//,
        `/newNodes/${nodeName}/`,
      );
      history.push({
        pathname: newPath,
        search: query.toString(),
      });
    } else {
      history.push({
        pathname: `/newNodes/${nodeName}/health`,
        search: query.toString(),
      });
    }
  };

  return (
    <NodeListContainer>
      <Table
        columns={columns}
        data={nodeTableData}
        rowClicked={onClickRow}
        theme={theme}
        selectedNodeName={selectedNodeName}
      />
    </NodeListContainer>
  );
};

export default NodeListTable;
