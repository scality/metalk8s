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
  useBlockLayout,
} from 'react-table';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useURLQuery } from '../services/utils';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import CircleStatus from './CircleStatus';
import {
  Button,
  ProgressBar,
  Tooltip,
  SearchInput,
  EmptyTable,
} from '@scality/core-ui';
import { useIntl } from 'react-intl';
import TableRow from './TableRow';
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
} from './style/CommonLayoutStyle';
import { UnknownIcon, TooltipContent } from './TableRow';

const VolumeListContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-family: 'Lato';
  font-size: ${fontSize.base};
  background-color: ${(props) => props.theme.backgroundLevel2};
  .table {
    display: block;
    padding-bottom: ${padding.smaller};

    .sc-select-container {
      width: 120px;
      height: 10px;
    }

    .thead > div[role='row'] {
      border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};
      font-weight: bold;

      div[role='columnheader'] {
        color: ${(props) => props.theme.textPrimary} !important;
        cursor: pointer;
      }
    }

    .td {
      margin: 0;
      text-align: left;
      // seperation lines between rows
      border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};
      :last-child {
        border-right: 0;
      }
    }

    .sc-emptytable {
      background-color: ${(props) => props.theme.backgroundLevel2};
      > * {
        background-color: ${(props) => props.theme.backgroundLevel2};
      }
    }
  }

  .sc-progressbarcontainer {
    width: 100%;
  }
`;

// * table body
const Body = styled.div`
  display: block;
  // 100vh - 48px(Navbar) - 77px(Table Search) - 32px(Table Header) - 15px(Margin bottom)
  height: calc(100vh - 172px);
`;

const CreateVolumeButton = styled(Button)`
  margin-left: ${padding.larger};
`;

const ActionContainer = styled.span`
  display: flex;
  flex-direction: row-reverse;
  justify-content: space-between;
  padding: ${padding.large} ${padding.base} 26px 20px;
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
    <SearchInput
      value={value || undefined}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      placeholder={`Search`}
      disableToggle={true}
      data-cy="volume_list_search"
    />
  );
}

function Table({
  columns,
  data,
  nodeName,
  volumeName,
  theme,
  isSearchBar,
  onClickRow,
}) {
  const history = useHistory();
  const query = useURLQuery();
  const querySearch = query.get('search');
  const querySort = query.get('sort');
  const queryDesc = query.get('desc');
  const intl = useIntl();
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

  const DEFAULT_SORTING_KEY = 'health';
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
            id: querySort || DEFAULT_SORTING_KEY,
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
    useBlockLayout,
  );

  // Synchronizes the params query with the Table sort state
  const sorted = headerGroups[0].headers.find((item) => item.isSorted === true)
    ?.id;
  const desc = headerGroups[0].headers.find((item) => item.isSorted === true)
    ?.isSortedDesc;
  useTableSortURLSync(sorted, desc, data, DEFAULT_SORTING_KEY);

  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);

      return (
        <TableRow
          row={row}
          style={style}
          isSelected={volumeName === row.values.name}
          onClickRow={onClickRow}
        ></TableRow>
      );
    },
    [prepareRow, rows, volumeName, onClickRow],
  );

  return (
    <>
      <div {...getTableProps()} className="table">
        <div className="thead">
          {/* The first row should be the search bar */}
          <div className="tr">
            <div className="th">
              <ActionContainer>
                <CreateVolumeButton
                  size="base"
                  variant={'buttonPrimary'}
                  text={intl.formatMessage({ id: 'create_new_volume' })}
                  icon={<i className="fas fa-plus"></i>}
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
            </div>
          </div>

          {headerGroups.map((headerGroup) => {
            return (
              <div
                {...headerGroup.getHeaderGroupProps()}
                style={{
                  display: 'flex',
                  marginLeft: '3px',
                }}
              >
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
              </div>
            );
          })}
        </div>
        <Body {...getTableBodyProps()}>
          {data.length === 0 ? (
            <EmptyTable useDiv={true}>
              {intl.formatMessage({ id: 'no_volume_found' })}
            </EmptyTable>
          ) : null}
          {/* <AutoSizer> is a <div/> so it breaks the table layout,
          we need to use <div/> for all the parts of table(thead, tbody, tr, td...) and retrieve the defaullt styles by className. */}
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={rows.length} // how many items we are going to render
                itemSize={48} // height of each row in pixel
                width={width}
              >
                {RenderRow}
              </List>
            )}
          </AutoSizer>
        </Body>
      </div>
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
  const intl = useIntl();
  const theme = useSelector((state) => state.config.theme);

  const columns = React.useMemo(() => {
    return [
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: {
          textAlign: 'center',
          width: '75px',
        },
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
        cellStyle: {
          textAlign: 'left',
          flex: 1,
          minWidth: '95px',
        },
      },
      {
        Header: 'Usage',
        accessor: 'usage',
        cellStyle: {
          textAlign: 'center',
          width: isNodeColumn ? '70px' : '150px',
        },
        Cell: ({ value }) => {
          return (
            <ProgressBar
              size="large"
              percentage={value}
              buildinLabel={`${value}%`}
              color={theme.infoSecondary}
              backgroundColor={theme.buttonSecondary}
            />
          );
        },
      },
      {
        Header: 'Size',
        accessor: 'storageCapacity',
        cellStyle: {
          textAlign: 'right',
          width: isNodeColumn ? '70px' : '110px',
          paddingRight: '5px',
        },
        sortType: 'size',
        Cell: ({ value }) => formatSizeForDisplay(value),
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: {
          textAlign: 'center',
          width: isNodeColumn ? '60px' : '120px',
        },
        Cell: (cellProps) => {
          const volume = volumeListData?.find(
            (vol) => vol.name === cellProps.cell.row.values.name,
          );
          switch (cellProps.value) {
            case 'exclamation':
              return (
                <Tooltip
                  placement={cellProps.row.index === 0 ? 'bottom' : 'top'}
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
                  placement={cellProps.row.index === 0 ? 'bottom' : 'top'}
                  overlay={<TooltipContent>In use</TooltipContent>}
                >
                  <i className="fas fa-link"></i>
                </Tooltip>
              );
            case 'unlink':
              return (
                <Tooltip
                  placement={cellProps.row.index === 0 ? 'bottom' : 'top'}
                  overlay={<TooltipContent>Unused</TooltipContent>}
                >
                  <i className="fas fa-unlink"></i>
                </Tooltip>
              );
            default:
              return (
                <Tooltip
                  placement={cellProps.row.index === 0 ? 'bottom' : 'top'}
                  overlay={
                    <TooltipContent>
                      {intl.formatMessage({ id: 'unknown' })}
                    </TooltipContent>
                  }
                >
                  <UnknownIcon
                    className="fas fa-minus"
                    theme={theme}
                  ></UnknownIcon>
                </Tooltip>
              );
          }
        },
        sortType: 'status',
      },
      {
        Header: 'Latency',
        accessor: 'latency',
        cellStyle: {
          textAlign: 'right',
          width: isNodeColumn ? '70px' : '110px',
          paddingRight: '6px',
        },
        Cell: (cellProps) => {
          return cellProps.value !== undefined ? cellProps.value + ' µs' : null;
        },
      },
    ];
  }, [volumeListData, theme, isNodeColumn]);
  const nodeCol = {
    Header: 'Node',
    accessor: 'node',
    cellStyle: {
      textAlign: 'left',
      flex: 1,
      paddingLeft: '12px',
      minWidth: '50px',
    },
  };
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
        onClickRow={onClickRow}
        volumeName={volumeName}
        theme={theme}
        isSearchBar={isSearchBar}
      />
    </VolumeListContainer>
  );
};

export default VolumeListTable;
