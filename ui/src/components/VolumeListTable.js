import React from 'react';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import {
  useTable,
  useFilters,
  useGlobalFilter,
  useAsyncDebounce,
} from 'react-table';
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
  padding: ${padding.smaller};
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: ${(props) => props.theme.brand.borderLight};
  .sc-progressbarcontainer {
    width: 65px;
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
      padding: 5px 5px 5px 0;

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
  height: calc(100vh - 10px);
  overflow: auto;
  height: 500px;
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
}) {
  const history = useHistory();
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined);
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
          color: '#ffffff',
          border: 'solid 1px #3b4045',
          width: '223px',
          height: '27px',
          borderRadius: '4px',
          backgroundColor: '#141416',
          fontFamily: 'Lato',
          fontStyle: 'italic',
          opacity: '0.5',
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
            history.push(`/nodes/${nodeName}/createVolume`);
          } else {
            history.push('/volumes/createVolume');
          }
        }}
      />
    </ActionContainer>
  );
}

function Table({ columns, data, nodeName, rowClicked, volumeName }) {
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
              />
            </th>
          </tr>
          {headerGroups.map((headerGroup) => (
            <HeadRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </HeadRow>
          ))}
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
                  if (cell.column.Header === 'Name') {
                    return (
                      <Cell {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </Cell>
                    );
                  } else if (
                    cell.column.Header === 'Usage' &&
                    cell.value !== intl.translate('unknown')
                  ) {
                    return (
                      <Cell {...cell.getCellProps()}>
                        <ProgressBar
                          size="base"
                          percentage={cell.value}
                          buildinLabel={`${cell.value}%`}
                        />
                      </Cell>
                    );
                  } else if (
                    cell.column.Header === 'Usage' &&
                    cell.value === intl.translate('unknown')
                  ) {
                    return (
                      <Cell {...cell.getCellProps()}>
                        <div>{intl.translate('unknown')}</div>
                      </Cell>
                    );
                  } else if (cell.column.Header === 'Status') {
                    const volume = data?.find(
                      (vol) => vol.name === cell.row.values.name,
                    );

                    switch (cell.value) {
                      case 'exclamation':
                        return (
                          <Cell {...cell.getCellProps()}>
                            <Tooltip
                              placement="top"
                              overlay={
                                <TooltipContent>
                                  {volume?.errorReason}
                                </TooltipContent>
                              }
                            >
                              <i className="fas fa-exclamation"></i>
                            </Tooltip>
                          </Cell>
                        );
                      case 'link':
                        return (
                          <Cell {...cell.getCellProps()}>
                            <Tooltip
                              placement="top"
                              overlay={<TooltipContent>In use</TooltipContent>}
                            >
                              <i className="fas fa-link"></i>
                            </Tooltip>
                          </Cell>
                        );
                      case 'unlink':
                        return (
                          <Cell {...cell.getCellProps()}>
                            <Tooltip
                              placement="top"
                              overlay={<TooltipContent>Unused</TooltipContent>}
                            >
                              <i className="fas fa-unlink"></i>
                            </Tooltip>
                          </Cell>
                        );
                      default:
                        return (
                          <Cell {...cell.getCellProps()}>
                            <div>{intl.translate('unknown')}</div>
                          </Cell>
                        );
                    }
                  } else if (cell.column.Header === 'Health') {
                    return (
                      <Cell {...cell.getCellProps()}>
                        <CircleStatus
                          className="fas fa-circle"
                          status={cell.value}
                        />
                      </Cell>
                    );
                  } else {
                    return (
                      <Cell {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </Cell>
                    );
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

  const columns = React.useMemo(
    () => [
      { Header: 'Name', accessor: 'name' },
      // volumes filter by node don't necessarily to display the node name
      { Header: 'Node', accessor: 'node' },
      { Header: 'Usage', accessor: 'usage' },
      { Header: 'Size', accessor: 'storageCapacity' },
      { Header: 'Health', accessor: 'health' },
      { Header: 'Status', accessor: 'status' },
      { Header: 'Latency', accessor: 'latency' },
    ],
    [],
  );

  // handle the row selection by updating the URL
  const onClickRow = (row) => {
    // there are two possiable URLs
    if (history?.location?.state?.fromNodePage) {
      const location = {
        pathname: `/volumes/${row.values.name}`,
        search: `?node=${nodeName}`,
        // access the Volume Page from Node Page
        state: { fromNodePage: true },
      };
      history.push(location);
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
      />
    </VolumeListContainer>
  );
};

export default VolumeListTable;
