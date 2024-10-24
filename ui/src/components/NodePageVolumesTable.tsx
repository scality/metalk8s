import {
  ConstrainedText,
  Icon,
  Link,
  ProgressBar,
  Tooltip,
  Wrap,
  spacing,
} from '@scality/core-ui';
import { Button, Table } from '@scality/core-ui/dist/next';
import isEqual from 'lodash.isequal';
import React from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router';
import styled, { useTheme } from 'styled-components';
import {
  VOLUME_CONDITION_EXCLAMATION,
  VOLUME_CONDITION_LINK,
  VOLUME_CONDITION_UNLINK,
} from '../constants';
import { formatSizeForDisplay } from '../services/utils';
import CircleStatus from './CircleStatus';
import { Latency } from './Latency';
import { TooltipContent, UnknownIcon } from './TableRow';
const VolumeListContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  height: 100%;
`;
const VolumeListTable = React.memo((props) => {
  // @ts-expect-error - FIXME when you are working on it
  const { nodeName, volumeListData } = props;
  const history = useHistory();
  const theme = useTheme();
  const intl = useIntl();
  const columns = React.useMemo(() => {
    const onClickCell = (name) => {
      history.push(`/volumes/${name}/overview`);
    };

    return [
      {
        Header: 'Health',
        accessor: 'health',
        cellStyle: {
          textAlign: 'center',
          width: 'unset',
          flex: 0.5,
          maxWidth: '4rem',
        },
        Cell: (cellProps) => {
          return <CircleStatus status={cellProps.value} />;
        },
        sortType: 'health',
      },
      {
        Header: 'Name',
        accessor: 'name',
        cellStyle: {
          textAlign: 'left',
          width: 'unset',
          flex: 1.25,
          minWidth: '4rem',
        },
        Cell: ({ value, row }) => {
          return (
            <div>
              <Link
                data-cy="volume_table_name_cell"
                onClick={() => {
                  onClickCell(value);
                }}
              >
                <ConstrainedText
                  text={value}
                  tooltipStyle={{
                    width: '150px',
                  }}
                  tooltipPlacement={row.index === 0 ? 'bottom' : 'top'}
                ></ConstrainedText>
              </Link>
            </div>
          );
        },
      },
      {
        Header: 'Usage',
        accessor: 'usage',
        cellStyle: {
          textAlign: 'center',
          width: 'unset',
          minWidth: '4rem',
          flex: 1,
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
          width: 'unset',
          minWidth: '3rem',
          flex: 0.75,
        },
        sortType: (row1, row2) => {
          const size1 = row1?.original?.storageCapacityBytes;
          const size2 = row2?.original?.storageCapacityBytes;

          if (size1 && size2) {
            return size1 - size2;
          } else return !size1 ? -1 : 1;
        },
        Cell: ({ value }) => formatSizeForDisplay(value),
      },
      {
        Header: 'Status',
        accessor: 'status',
        cellStyle: {
          textAlign: 'center',
          minWidth: '3rem',
          width: 'unset',
          flex: 0.5,
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
                  <Icon name="Exclamation" />
                </Tooltip>
              );

            case 'link':
              return (
                <Tooltip
                  placement={cellProps.row.index === 0 ? 'bottom' : 'top'}
                  overlay={<TooltipContent>In use</TooltipContent>}
                >
                  <Icon name="Link" />
                </Tooltip>
              );

            case 'unlink':
              return (
                <Tooltip
                  placement={cellProps.row.index === 0 ? 'bottom' : 'top'}
                  overlay={<TooltipContent>Unused</TooltipContent>}
                >
                  <Icon name="Unlink" />
                </Tooltip>
              );

            default:
              return (
                <Tooltip
                  placement={cellProps.row.index === 0 ? 'bottom' : 'top'}
                  overlay={
                    <TooltipContent>
                      {intl.formatMessage({
                        id: 'unknown',
                      })}
                    </TooltipContent>
                  }
                >
                  <UnknownIcon name="Minus" />
                </Tooltip>
              );
          }
        },
        sortType: (row1, row2) => {
          const weights = {};
          weights[VOLUME_CONDITION_LINK] = 2;
          weights[VOLUME_CONDITION_UNLINK] = 1;
          weights[VOLUME_CONDITION_EXCLAMATION] = 0;
          return weights[row1?.values?.status] - weights[row2?.values?.status];
        },
      },
      {
        Header: 'Latency',
        accessor: 'latency',
        cellStyle: {
          textAlign: 'right',
          flex: 0.75,
          width: 'unset',
          minWidth: '3rem',
        },
        Cell: (cellProps) => {
          return cellProps.value !== undefined ? (
            <Latency latencyInMicroSeconds={cellProps.value} />
          ) : null;
        },
      },
    ]; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeListData, theme, history, nodeName]);
  return (
    <Table
      columns={columns}
      data={volumeListData}
      defaultSortingKey="health"
      entityName={{
        en: {
          singular: 'volume',
          plural: 'volumes',
        },
      }}
    >
      <Wrap padding={spacing.r16}>
        <p></p>
        <Button
          variant={'secondary'}
          label={intl.formatMessage({
            id: 'create_new_volume',
          })}
          icon={<Icon name="Create-add" />}
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
      </Wrap>
      <Table.SingleSelectableContent
        rowHeight="h40"
        separationLineVariant="backgroundLevel3"
      />
    </Table>
  );
}, isEqual);
export default VolumeListTable;
