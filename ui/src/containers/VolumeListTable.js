import React, { useState } from 'react';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import {
  useTable,
  useFilters,
  useGlobalFilter,
  useAsyncDebounce,
  useRowSelect,
} from 'react-table';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import CircleStatus from '../components/CircleStatus';
import { Button, ProgressBar, Tooltip } from '@scality/core-ui';
import { intl } from '../translations/IntlGlobalProvider';

const VolumeListContainer = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: #2c3137;
  .sc-progressbarcontainer {
    width: 84px;
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

const TableRow = styled.tr`
  &:hover,
  &:focus {
    background-color: ${(props) => props.theme.brand.backgroundBluer};
    border-top: 1px solid ${(props) => props.theme.brand.secondary};
    border-bottom: 1px solid ${(props) => props.theme.brand.secondary};
    outline: none;
    cursor: pointer;
  }
`;

// ActionContainer for the volume table
const ActionContainer = styled.span`
  display: flex;
`;

const CreateVolumeButton = styled(Button)`
  margin-left: ${padding.larger};
`;

const TooltipContent = styled.div`
  color: ${(props) => props.theme.brand.textSecondary};
  font-weight: ${fontWeight.bold};
  width: 60px;
`;

const VolumeListTable = (props) => {
  const { nodeName, volumeListData } = props;
  const history = useHistory();
  // We should manage the table state inside the table component instead of volume
  const [searchedVolumeName, setSearchedVolumeName] = useState('');

  function GlobalFilter({
    preGlobalFilteredRows,
    globalFilter,
    setGlobalFilter,
  }) {
    const [value, setValue] = React.useState(globalFilter);

    const onChange = useAsyncDebounce((value) => {
      setGlobalFilter(value || undefined);
      setSearchedVolumeName(value);
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
            height: '28px',
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
            history.push(`/nodes/${nodeName}/createVolume`);
          }}
        />
      </ActionContainer>
    );
  }

  // React Table for the volume list
  function Table({ columns, data, getTrProps }) {
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
        initialState: { globalFilter: searchedVolumeName },
        defaultColumn,
        getTrProps,
      },
      useFilters,
      useGlobalFilter,
      useRowSelect,
    );

    // Render the UI for your table
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
                />
              </th>
            </tr>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps()}>
                    {column.render('Header')}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row, i) => {
              prepareRow(row);
              return (
                <TableRow {...row.getRowProps({ onClick: () => rowInfo(row) })}>
                  {row.cells.map((cell) => {
                    if (
                      cell.column.Header === 'Usage' &&
                      cell.value !== intl.translate('unknown')
                    ) {
                      return (
                        <td {...cell.getCellProps()}>
                          <ProgressBar
                            size="base"
                            percentage={cell.value}
                            buildinLabel={`${cell.value}%`}
                          />
                        </td>
                      );
                    } else if (cell.column.Header === 'Status') {
                      // Display the icon based on the computation of volume status and volume bound
                      // Exclamation: Failed + Unbound => get the reason
                      // Unlink: Available + Unbound
                      // Link: Available + Bound

                      // volume name: cell.row.values.name
                      const volume = volumeListData?.find(
                        (vol) => vol.name === cell.row.values.name,
                      );
                      switch (cell.value) {
                        case 'exclamation':
                          return (
                            <td {...cell.getCellProps()}>
                              <Tooltip
                                placement="top"
                                overlay={
                                  <TooltipContent>
                                    {volume.status.conditions[0].reason}
                                  </TooltipContent>
                                }
                              >
                                <i className="fas fa-exclamation"></i>
                              </Tooltip>
                            </td>
                          );
                        case 'link':
                          return (
                            <td {...cell.getCellProps()}>
                              <Tooltip
                                placement="top"
                                overlay={
                                  <TooltipContent>In use</TooltipContent>
                                }
                              >
                                <i className="fas fa-link"></i>
                              </Tooltip>
                            </td>
                          );
                        case 'unlink':
                          return (
                            <td {...cell.getCellProps()}>
                              <Tooltip
                                placement="top"
                                overlay={
                                  <TooltipContent>Unused</TooltipContent>
                                }
                              >
                                <i className="fas fa-unlink"></i>
                              </Tooltip>
                            </td>
                          );
                        default:
                          console.error('New conditions');
                      }
                    } else if (cell.column.Header === 'Health') {
                      return (
                        <td {...cell.getCellProps()}>
                          <CircleStatus
                            className="fas fa-circle"
                            status={cell.value}
                          />
                        </td>
                      );
                    } else {
                      return (
                        <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                      );
                    }
                  })}
                </TableRow>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }

  const columns = React.useMemo(() => [
    { Header: 'Name', accessor: 'name' },
    // volumes filter by node don't necessarily to display the node name
    // { Header: 'Node', accessor: 'node' },
    { Header: 'Usage', accessor: 'usage' },
    { Header: 'Size', accessor: 'storageCapacity' },
    { Header: 'Health', accessor: 'health' },
    { Header: 'Status', accessor: 'status' },
    { Header: 'Created', accessor: 'creationTime' },
    { Header: 'Latency', accessor: 'latency' },
  ]);

  // handle the row selection by updating the URL
  const rowInfo = (rowobject) => {
    history.push(`/nodes/${nodeName}/volumes/${rowobject.values.name}`);
  };

  return (
    <VolumeListContainer>
      <Table columns={columns} data={volumeListData} rowInfo={rowInfo} />
    </VolumeListContainer>
  );
};

export default VolumeListTable;
