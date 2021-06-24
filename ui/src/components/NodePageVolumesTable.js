import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { useTable, useFilters, useSortBy, useBlockLayout } from 'react-table';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import CircleStatus from './CircleStatus';
import {
  Button,
  ProgressBar,
  Tooltip,
  EmptyTable,
  ConstrainedText,
} from '@scality/core-ui';
import { useIntl } from 'react-intl';
import {
  VOLUME_CONDITION_LINK,
  VOLUME_CONDITION_UNLINK,
  VOLUME_CONDITION_EXCLAMATION,
} from '../constants';
import {
  allSizeUnitsToBytes,
  compareHealth,
  formatSizeForDisplay,
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

  .table {
    display: block;
    padding-bottom: ${padding.smaller};

    .sc-select-container {
      width: 120px;
      height: 10px;
    }

    .thead > div[role='row'] {
      // seperation line between header and content
      border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};

      div[role='columnheader'] {
        color: ${(props) => props.theme.textPrimary} !important;
        cursor: pointer;
      }
    }

    .td {
      margin: 0;
      text-align: left;
      // speration lines between rows
      border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};
      :last-child {
        border-right: 0;
      }
    }

    .sc-emptytable {
      background-color: ${(props) => props.theme.backgroundLevel4};
      > * {
        background-color: ${(props) => props.theme.backgroundLevel4};
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
  height: calc(100vh - 200px);
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

const NameLinkContaner = styled.div`
  cursor: pointer;
  padding-right: ${padding.small};
`;

const TableRowStyle = styled.div``;

const TableRow = (props) => {
  const { row, style, onClickRow, isSelected } = props;
  const intl = useIntl();
  return (
    <TableRowStyle
      {...row.getRowProps({
        onClick: props.onClickRow ? () => onClickRow(row) : null,
        // Note:
        // We need to pass the style property to the row component.
        // Otherwise when we scroll down, the next rows are flashing because they are re-rendered in loop.
        style: { ...style },
      })}
      isSelected={isSelected}
      row={row}
    >
      {row.cells.map((cell) => {
        let cellProps = cell.getCellProps({
          style: {
            ...cell.column.cellStyle,
            // Vertically center the text in cells.
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          },
        });

        if (cell.column.Header !== 'Name' && cell.value === undefined) {
          return (
            <div {...cellProps} className="td">
              <Tooltip
                placement={cell.row.index === 0 ? 'bottom' : 'top'}
                overlay={
                  <TooltipContent>
                    {intl.formatMessage({ id: 'unknown' })}
                  </TooltipContent>
                }
              >
                <UnknownIcon className="fas fa-minus"></UnknownIcon>
              </Tooltip>
            </div>
          );
        } else {
          return (
            <div {...cellProps} className="td">
              {cell.render('Cell')}
            </div>
          );
        }
      })}
    </TableRowStyle>
  );
};

function Table({ columns, data, nodeName, volumeName, theme }) {
  const history = useHistory();
  const intl = useIntl();
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
  } = useTable(
    {
      columns,
      data,
      initialState: {
        sortBy: [
          {
            id: DEFAULT_SORTING_KEY,
            desc: false,
          },
        ],
      },
      disableMultiSort: true,
      autoResetSortBy: false,
      sortTypes,
    },
    useFilters,
    useSortBy,
    useBlockLayout,
  );

  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);

      return (
        <TableRow
          row={row}
          style={style}
          isSelected={volumeName === row.values.name}
          isNameLink={true}
        ></TableRow>
      );
    },
    [prepareRow, rows, volumeName],
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
                  size="small"
                  variant={'buttonSecondary'}
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
  const { nodeName, volumeListData, volumeName } = props;
  const history = useHistory();
  const theme = useSelector((state) => state.config.theme);
  const intl = useIntl();
  const columns = React.useMemo(() => {
    const onClickCell = (name) => {
      history.push(`/volumes/${name}/overview?node=${nodeName}`);
    };

    return [
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: {
          textAlign: 'center',
          flexBasis: '105px',
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
          color: theme.selectedActive,
        },
        Cell: ({ value, row }) => {
          return (
            <NameLinkContaner
              data-cy="volume_table_name_cell"
              onClick={() => {
                onClickCell(value);
              }}
            >
              <ConstrainedText
                text={value}
                tooltipStyle={{ width: '150px' }}
                tooltipPlacement={row.index === 0 ? 'bottom' : 'top'}
              ></ConstrainedText>
            </NameLinkContaner>
          );
        },
      },
      {
        Header: 'Usage',
        accessor: 'usage',
        cellStyle: {
          textAlign: 'center',
          width: '120px',
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
          width: '65px',
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
          width: '65px',
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
          width: '75px',
          paddingRight: '6px',
        },
        Cell: (cellProps) => {
          return cellProps.value !== undefined ? cellProps.value + ' µs' : null;
        },
      },
    ];
  }, [volumeListData, theme, history, nodeName]);

  return (
    <VolumeListContainer>
      <Table
        columns={columns}
        data={volumeListData}
        nodeName={nodeName}
        volumeName={volumeName}
        theme={theme}
      />
    </VolumeListContainer>
  );
};

export default VolumeListTable;
