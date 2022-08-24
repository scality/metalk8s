import React from 'react';
import { useHistory } from 'react-router';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'styled-components';
import { ProgressBar, Tooltip } from '@scality/core-ui';
import { Box, Button, Table } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import CircleStatus from './CircleStatus';
import { UnknownIcon, TooltipContent } from './TableRow';

const VolumeListTable = (props) => {
  const { nodeName, volumeListData, volumeName } = props;
  const history = useHistory();
  const location = useLocation();
  const intl = useIntl();
  const theme = useTheme();

  const columns = React.useMemo(() => {
    return [
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: {
          textAlign: 'center',
          width: '5rem',
        },
        Cell: (cellProps) => {
          return (
            <CircleStatus className="fas fa-circle" status={cellProps.value} />
          );
        },
      },
      {
        Header: 'Name',
        accessor: 'name',
        cellStyle: {
          textAlign: 'left',
          flex: 1,
          minWidth: '4rem',
        },
      },
      {
        Header: 'Node',
        accessor: 'node',
        cellStyle: {
          textAlign: 'left',
          flex: 1,
          paddingLeft: '0.857rem',
          minWidth: '3.214rem',
        },
      },
      {
        Header: 'Usage',
        accessor: 'usage',
        cellStyle: {
          textAlign: 'center',
          width: '5rem',
          paddingRight: '0.714rem',
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
          width: '5.714rem',
          paddingRight: '1rem',
        },
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: {
          textAlign: 'center',
          width: '3.929rem',
          paddingRight: '0.714rem',
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
      },
      {
        Header: 'Latency',
        accessor: 'latency',
        cellStyle: {
          textAlign: 'right',
          width: '4.643rem',
          paddingRight: '1rem',
        },
        Cell: (cellProps) => {
          return cellProps.value !== undefined ? cellProps.value + ' µs' : null;
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeListData, theme]);

  // handle the row selection by updating the URL
  const onClickRow = (row) => {
    const query = new URLSearchParams(location.search);
    const isAddNodeFilter = query.has('search');
    const isTabSelected =
      location.pathname.endsWith('/alerts') ||
      location.pathname.endsWith('/metrics') ||
      location.pathname.endsWith('/details');

    if (isAddNodeFilter) {
      history.push(`/volumes/${row.values.name}/overview?search=${nodeName}`);
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
    <Box height={'100%'}>
      <Table
        columns={columns}
        data={volumeListData}
        defaultSortingKey={'health'}
        getRowId={(row) => row.name}
      >
        <Box
          display="flex"
          justifyContent={'space-between'}
          pt={'16px'}
          px={'16px'}
        >
          <Table.SearchWithQueryParams
            displayedName={{
              singular: 'volume',
              plural: 'volumes',
            }}
          />
          <Button
            variant={'primary'}
            label={intl.formatMessage({ id: 'create_new_volume' })}
            icon={<i className="fas fa-plus" />}
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
        </Box>
        <Table.SingleSelectableContent
          rowHeight="h40"
          separationLineVariant="backgroundLevel1"
          backgroundVariant="backgroundLevel2"
          selectedId={volumeName}
          onRowSelected={onClickRow}
          children={(Rows) => {
            return <>{Rows}</>;
          }}
        />
      </Table>
    </Box>
  );
};

export default VolumeListTable;
