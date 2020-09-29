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
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import CircleStatus from './CircleStatus';
import { Button, ProgressBar, Tooltip } from '@scality/core-ui';
import { intl } from '../translations/IntlGlobalProvider';

const VolumeListContainer = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  padding: ${padding.base};
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: ${(props) => props.theme.brand.borderLight};
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
      border-bottom: 1px solid black;
      text-align: left;
      padding: 5px;

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

const TableRow = styled(HeadRow)`
  height: 48px;
  &:hover,
  &:focus {
    background-color: ${(props) => props.theme.brand.backgroundBluer};
    border-top: 1px solid ${(props) => props.theme.brand.secondary};
    border-bottom: 1px solid ${(props) => props.theme.brand.secondary};
    outline: none;
    cursor: pointer;
  }

  background-color: ${(props) =>
    props.volumeName === props.row.values.name
      ? props.theme.brand.backgroundBluer
      : props.theme.brand.primary};
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
  border-top: 1px solid #424242;
`;

const ActionContainer = styled.span`
  display: flex;
`;

const CreateVolumeButton = styled(Button)`
  margin-left: ${padding.larger};
`;

const TooltipContent = styled.div`
  color: ${(props) => props.theme.brand.textSecondary};
  font-weight: ${fontWeight.bold};
  min-width: 60px;
`;

function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
  nodeName,
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
      <CreateVolumeButton
        size="small"
        variant="secondary"
        text={intl.translate('create_new_volume')}
        icon={<i className="fas fa-plus-circle"></i>}
        onClick={() => {
          // depends on if we add node filter
          if (nodeName) {
            history.push(`/volumes/createVolume?node=${nodeName}`);
          } else {
            history.push('/volumes/createVolume');
          }
        }}
        data-cy="create-volume-button"
      />
    </ActionContainer>
  );
}

function Table({ columns, data, nodeName, rowClicked, volumeName, theme }) {
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
                nodeName={nodeName}
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
                volumeName={volumeName}
                row={row}
              >
                {row.cells.map((cell) => {
                  let cellProps = cell.getCellProps({
                    style: {
                      ...cell.column.cellStyle,
                    },
                  });
                  if (cell.column.Header === 'Name') {
                    return (
                      <Cell {...cellProps} data-cy="volume_table_name_cell">
                        {cell.render('Cell')}
                      </Cell>
                    );
                  } else if (
                    cell.column.Header !== 'Name' &&
                    cell.value === undefined
                  ) {
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

const VolumeListTable = (props) => {
  const { nodeName, volumeListData, volumeName } = props;
  const history = useHistory();
  const location = useLocation();

  const theme = useSelector((state) => state.config.theme);

  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        width: 200,
      },
      { Header: 'Node', accessor: 'node' },
      {
        Header: 'Usage',
        accessor: 'usage',
        cellStyle: { textAlign: 'center' },
        Cell: ({ value }) => {
          return (
            <ProgressBar
              size="base"
              percentage={value}
              buildinLabel={`${value}%`}
              backgroundColor={theme.brand.primaryDark1}
            />
          );
        },
      },
      {
        Header: 'Size',
        accessor: 'storageCapacity',
        cellStyle: { textAlign: 'center', width: '70px' },
      },
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: { textAlign: 'center', width: '50px' },
        Cell: (cellProps) => {
          return (
            <CircleStatus className="fas fa-circle" status={cellProps.value} />
          );
        },
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: { textAlign: 'center', width: '50px' },
        Cell: (cellProps) => {
          const volume = volumeListData?.find(
            (vol) => vol.name === cellProps.cell.row.values.name,
          );
          switch (cellProps.value) {
            case 'exclamation':
              return (
                <Tooltip
                  placement="top"
                  overlay={
                    <TooltipContent>{volume?.errorReason}</TooltipContent>
                  }
                >
                  <i className="fas fa-exclamation"></i>
                </Tooltip>
              );
            case 'link':
              return (
                <Tooltip
                  placement="top"
                  overlay={<TooltipContent>In use</TooltipContent>}
                >
                  <i className="fas fa-link"></i>
                </Tooltip>
              );
            case 'unlink':
              return (
                <Tooltip
                  placement="top"
                  overlay={<TooltipContent>Unused</TooltipContent>}
                >
                  <i className="fas fa-unlink"></i>
                </Tooltip>
              );
            default:
              return <div>{intl.translate('unknown')}</div>;
          }
        },
      },
      {
        Header: 'Latency',
        accessor: 'latency',
        cellStyle: { textAlign: 'center', width: '70px' },
      },
    ],
    [volumeListData, theme],
  );

  // handle the row selection by updating the URL
  const onClickRow = (row) => {
    const query = new URLSearchParams(location.search);
    const isAddNodeFilter = query.has('node');

    // there are two possiable URLs
    if (isAddNodeFilter) {
      history.push(`/volumes/${row.values.name}?node=${nodeName}`);
    } else {
      history.push(`/volumes/${row.values.name}`);
    }
  };

  return (
    <VolumeListContainer>
      <Table
        columns={columns}
        data={volumeListData}
        nodeName={nodeName}
        rowClicked={onClickRow}
        volumeName={volumeName}
        theme={theme}
      />
    </VolumeListContainer>
  );
};

export default VolumeListTable;
