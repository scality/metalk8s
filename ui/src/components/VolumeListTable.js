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
  useSortBy,
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
import {
  VOLUME_CONDITION_LINK,
  VOLUME_CONDITION_UNLINK,
  VOLUME_CONDITION_EXCLAMATION,
} from '../constants';
import {
  allSizeUnitsToBytes,
  compareHealth,
  formatSizeForDisplay,
  useTableSortURLSync,
} from '../services/utils';
import {
  SortCaretWrapper,
  SortIncentive,
  TableHeader,
} from './CommonLayoutStyle';

const VolumeListContainer = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: ${(props) => props.theme.brand.borderLight};
  background-color: ${(props) => props.theme.brand.primary};
  .sc-progressbarcontainer {
    width: 100%;
  }
  .sc-progressbarcontainer > div {
    background-color: ${(props) => props.theme.brand.secondaryDark1};
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

    thead tr[role='row'] {
      border-bottom: 1px solid ${(props) => props.theme.brand.border};
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
      height: 35px;
      text-align: left;
      padding: ${padding.smaller};
      cursor: pointer;
      vertical-align: baseline;
    }

    td {
      margin: 0;
      padding: 0.5rem;
      text-align: left;
      padding: 5px;
      border: none;
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
  border-bottom: 1px solid ${(props) => props.theme.brand.border};
  &:hover,
  &:focus {
    background-color: ${(props) => props.theme.brand.backgroundBluer};
    outline: none;
    cursor: pointer;
  }

  &:last-child {
    border: none;
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

const CreateVolumeButton = styled(Button)`
  margin-left: ${padding.larger};
`;

const ActionContainer = styled.span`
  display: flex;
  justify-content: space-between;
  padding: ${padding.base};
  flex-direction: row-reverse;
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
      data-cy="volume_list_search"
    />
  );
}

function Table({
  columns,
  data,
  nodeName,
  rowClicked,
  volumeName,
  theme,
  isSearchBar,
}) {
  const history = useHistory();
  const query = useQuery();
  const querySearch = query.get('search');
  const querySort = query.get('sort');
  const queryDesc = query.get('desc');

  // Use the state and functions returned from useTable to build your UI
  const defaultColumn = React.useMemo(
    () => ({
      Filter: GlobalFilter,
    }),
    [],
  );

  const sortTypes = React.useMemo(() => {
    return {
      health: (row1, row2) =>
        compareHealth(row2?.values?.health, row1?.values?.health),
      size: (row1, row2) => {
        const size1 = row1?.values?.storageCapacity;
        const size2 = row2?.values?.storageCapacity;

        if (size1 && size2) {
          return allSizeUnitsToBytes(size1) - allSizeUnitsToBytes(size2);
        } else return !size1 ? -1 : 1;
      },
      status: (row1, row2) => {
        const weights = {};
        weights[VOLUME_CONDITION_LINK] = 2;
        weights[VOLUME_CONDITION_UNLINK] = 1;
        weights[VOLUME_CONDITION_EXCLAMATION] = 0;

        return weights[row1?.values?.status] - weights[row2?.values?.status];
      },
    };
  }, []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    // visibleColumns,
    preGlobalFilteredRows,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      initialState: {
        globalFilter: querySearch,
        sortBy: [
          {
            id: querySort || 'health',
            desc: queryDesc || false,
          },
        ],
      },
      disableMultiSort: true,
      autoResetSortBy: false,
      sortTypes,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
  );

  // Synchronizes the params query with the Table sort state
  const sorted = headerGroups[0].headers.find((item) => item.isSorted === true)
    ?.id;
  const desc = headerGroups[0].headers.find((item) => item.isSorted === true)
    ?.isSortedDesc;
  useTableSortURLSync(sorted, desc, data);

  return (
    <>
      <table {...getTableProps()}>
        <thead>
          {/* The first row should be the search bar */}
          <HeadRow>
            <th
              style={{
                textAlign: 'left',
              }}
            >
              <ActionContainer>
                <CreateVolumeButton
                  size="small"
                  variant={'secondary'}
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
                  data-cy="create_volume_button"
                />
                {isSearchBar ? (
                  <GlobalFilter
                    preGlobalFilteredRows={preGlobalFilteredRows}
                    globalFilter={state.globalFilter}
                    setGlobalFilter={setGlobalFilter}
                    nodeName={nodeName}
                    theme={theme}
                  />
                ) : null}
              </ActionContainer>
            </th>
          </HeadRow>

          {headerGroups.map((headerGroup) => {
            return (
              <HeadRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => {
                  const headerStyleProps = column.getHeaderProps(
                    Object.assign(column.getSortByToggleProps(), {
                      style: column.cellStyle,
                    }),
                  );
                  return (
                    <TableHeader {...headerStyleProps}>
                      {column.render('Header')}
                      <SortCaretWrapper>
                        {column.isSorted ? (
                          column.isSortedDesc ? (
                            <i className="fas fa-sort-down" />
                          ) : (
                            <i className="fas fa-sort-up" />
                          )
                        ) : (
                          <SortIncentive>
                            <i className="fas fa-sort" />
                          </SortIncentive>
                        )}
                      </SortCaretWrapper>
                    </TableHeader>
                  );
                })}
              </HeadRow>
            );
          })}
        </thead>
        <Body {...getTableBodyProps()}>
          {data.length === 0 ? (
            <HeadRow
              style={{
                width: '100%',
                paddingTop: padding.base,
                height: '60px',
              }}
            >
              <td
                style={{
                  textAlign: 'center',
                  background: theme.brand.primary,
                }}
              >
                {intl.translate('no_volume_found')}
              </td>
            </HeadRow>
          ) : null}

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
  const {
    nodeName,
    volumeListData,
    volumeName,
    isNodeColumn,
    isSearchBar,
  } = props;
  const history = useHistory();
  const location = useLocation();

  const theme = useSelector((state) => state.config.theme);

  const columns = React.useMemo(
    () => [
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: { textAlign: 'center', width: '90px' },
        Cell: (cellProps) => {
          return (
            <CircleStatus className="fas fa-circle" status={cellProps.value} />
          );
        },
        sortType: 'health',
      },
      {
        Header: 'Name',
        accessor: 'name',
      },
      {
        Header: 'Usage',
        accessor: 'usage',
        cellStyle: {
          textAlign: 'center',
          width: isNodeColumn ? '120px' : '150px',
        },
        Cell: ({ value }) => {
          return (
            <ProgressBar
              size="large"
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
        cellStyle: {
          textAlign: 'center',
          width: isNodeColumn ? '70px' : '110px',
        },
        sortType: 'size',
        Cell: ({ value }) => formatSizeForDisplay(value),
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: {
          textAlign: 'center',
          width: isNodeColumn ? '70px' : '110px',
        },
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
        sortType: 'status',
      },
      {
        Header: 'Latency',
        accessor: 'latency',
        cellStyle: {
          textAlign: 'center',
          width: isNodeColumn ? '70px' : '110px',
        },
        Cell: (cellProps) => {
          return cellProps.value !== undefined ? cellProps.value + ' µs' : null;
        },
      },
    ],
    [volumeListData, theme, isNodeColumn],
  );
  const nodeCol = { Header: 'Node', accessor: 'node' };
  if (isNodeColumn) {
    columns.splice(2, 0, nodeCol);
  }

  // handle the row selection by updating the URL
  const onClickRow = (row) => {
    const query = new URLSearchParams(location.search);
    const isAddNodeFilter = query.has('node');
    const isTabSelected =
      location.pathname.endsWith('/alerts') ||
      location.pathname.endsWith('/metrics') ||
      location.pathname.endsWith('/details');

    if (isAddNodeFilter || !isNodeColumn) {
      history.push(`/volumes/${row.values.name}/overview?node=${nodeName}`);
    } else {
      if (isTabSelected) {
        const newPath = location.pathname.replace(
          /\/volumes\/[^/]*\//,
          `/volumes/${row.values.name}/`,
        );
        history.push({
          pathname: newPath,
          search: query.toString(),
        });
      } else {
        history.push({
          pathname: `/volumes/${row.values.name}/overview`,
          search: query.toString(),
        });
      }
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
        isSearchBar={isSearchBar}
      />
    </VolumeListContainer>
  );
};

export default VolumeListTable;
