import React from 'react';
import { useHistory } from 'react-router';
import styled, { useTheme } from 'styled-components';
import { padding, spacing } from '@scality/core-ui/dist/style/theme';
import isEqual from 'lodash.isequal';
import CircleStatus from './CircleStatus';
import { ProgressBar, Tooltip, ConstrainedText, Link } from '@scality/core-ui';
import { Table } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { formatSizeForDisplay } from '../services/utils';
import { UnknownIcon, TooltipContent } from './TableRow';
import { Button } from '@scality/core-ui/dist/next';
import {
  VOLUME_CONDITION_LINK,
  VOLUME_CONDITION_UNLINK,
  VOLUME_CONDITION_EXCLAMATION,
} from '../constants';
import { Icon } from '@scality/core-ui';
import { Latency } from './Latency';
const VolumeListContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  height: 100%;
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
const VolumeListTable = React.memo((props) => {
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
          width: '5rem',
          paddingRight: '0.714rem',
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
          minWidth: '6.429rem',
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
          width: '8.571rem',
          marginRight: spacing.sp8,
          marginLeft: spacing.sp8,
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
          width: '6rem',
          paddingRight: '0.357rem',
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
          width: '6rem',
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
          width: '5.357rem',
          paddingRight: '1rem',
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
    <VolumeListContainer>
      <ActionContainer>
        <CreateVolumeButton
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
      </ActionContainer>
      <Table columns={columns} data={volumeListData} defaultSortingKey="health">
        <Table.SingleSelectableContent
          rowHeight="h40"
          separationLineVariant="backgroundLevel3"
          backgroundVariant="backgroundLevel1"
        />
      </Table>
    </VolumeListContainer>
  );
}, isEqual);
export default VolumeListTable;
