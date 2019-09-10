import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { FormattedDate, FormattedTime } from 'react-intl';
import { withRouter } from 'react-router-dom';
import { Button, Table, Loader, Modal } from '@scality/core-ui';
import { padding, grayLight } from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';
import Tooltip from '../components/Tooltip';
import {
  sortSelector,
  sortCapacity,
  useRefreshEffect,
} from '../services/utils';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
  deleteVolumeAction,
} from '../ducks/app/volumes';
import {
  STATUS_UNKNOWN,
  STATUS_TERMINATING,
  STATUS_PENDING,
  STATUS_FAILED,
  STATUS_AVAILABLE,
  STATUS_BOUND,
  STATUS_RELEASED,
} from '../constants';

const ButtonContainer = styled.div`
  margin-top: ${padding.small};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const VolumeTable = styled.div`
  flex-grow: 1;
  margin-top: ${padding.small};
  .sc-table-column-cell-container-action {
    justify-content: center;
  }
`;

const NotificationButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const DeleteButton = styled(Button)`
  margin-left: ${padding.small};
`;

const ModalBody = styled.div`
  padding-bottom: ${padding.base};
`;

const IconButton = styled.button`
  border-radius: 30px;
  width: 30px;
  height: 30px;
  background-color: transparent;
  border: none;
  outline: none;
  cursor: ${props => {
    if (props.isEnableClick) {
      return `pointer`;
    } else {
      return `not-allowed`;
    }
  }};

  :hover {
    background-color: ${props => {
      if (props.isEnableClick) {
        return grayLight;
      }
    }};
  }
`;

const NodeVolumes = props => {
  const { intl } = props;

  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );

  const volumes = useSelector(state => state.app.volumes);
  const persistentVolumes = useSelector(state => state.app.volumes.pVList);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const [
    isDeleteConfirmationModalOpen,
    setisDeleteConfirmationModalOpen,
  ] = useState(false);
  const [deleteVolumeName, setDeleteVolumeName] = useState('');
  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const isVolumeDeletable = rowData => {
    const volumeStatus = rowData.status;
    const volumeName = rowData.name;

    switch (volumeStatus) {
      case STATUS_UNKNOWN:
      case STATUS_PENDING:
      case STATUS_TERMINATING:
        return false;
      case STATUS_FAILED:
      case STATUS_AVAILABLE:
        if (persistentVolumes?.length === 0) {
          return true;
        } else {
          const persistentVolume = persistentVolumes.find(
            pv => pv?.metadata?.name === volumeName,
          );
          const persistentVolumeStatus = persistentVolume?.status?.phase;

          switch (persistentVolumeStatus) {
            case STATUS_FAILED:
            case STATUS_AVAILABLE:
            case STATUS_RELEASED:
              return true;
            case STATUS_PENDING:
            case STATUS_BOUND:
              return false;
            default:
              console.error(
                `Unexpected state for PersistentVolume ${volumeName}:${persistentVolumeStatus}`,
              );
              return false;
          }
        }
      default:
        console.error(
          `Unexpected state for Volume ${volumeName}:${volumeStatus}`,
        );
        return false;
    }
  };

  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1,
    },
    {
      label: intl.messages.status,
      dataKey: 'status',
    },
    {
      label: intl.messages.bound,
      dataKey: 'bound',
    },
    {
      label: intl.messages.storageCapacity,
      dataKey: 'storageCapacity',
    },
    {
      label: intl.messages.storageClass,
      dataKey: 'storageClass',
    },
    {
      label: intl.messages.creationTime,
      dataKey: 'creationTime',
      renderer: data => (
        <span>
          <FormattedDate value={data} />{' '}
          <FormattedTime
            hour="2-digit"
            minute="2-digit"
            second="2-digit"
            value={data}
          />
        </span>
      ),
    },
    {
      label: intl.messages.action,
      dataKey: 'action',
      disableSort: true,
      width: 80,
      renderer: (data, rowData) => {
        const isEnableClick = isVolumeDeletable(rowData);
        const isTriggerTooltip = () => {
          if (isEnableClick) {
            return '';
          } else {
            return 'hover';
          }
        };

        const hintPopup = () => {
          let hintMessage = '';

          switch (rowData.status) {
            case STATUS_PENDING:
              hintMessage = intl.messages.volume_status_pending_hint;
              break;
            case STATUS_TERMINATING:
              hintMessage = intl.messages.volume_status_terminating_hint;
              break;
            case STATUS_UNKNOWN:
              hintMessage = intl.messages.volume_status_unknown_hint;
              break;
            case STATUS_FAILED:
            case STATUS_AVAILABLE:
              const persistentVolume = persistentVolumes.find(
                pv => pv?.metadata?.name === rowData.name,
              );
              const persistentVolumeStatus = persistentVolume?.status?.phase;
              switch (persistentVolumeStatus) {
                case STATUS_BOUND:
                  hintMessage =
                    intl.messages.volume_statue_failed_pv_bound_hint;
                  break;
                case STATUS_PENDING:
                  hintMessage =
                    intl.messages.volume_status_failed_pv_pending_hint;
                  break;
                default:
                  hintMessage = '';
              }
              break;
            default:
              hintMessage = '';
          }
          return hintMessage;
        };

        return (
          <div>
            <Tooltip
              placement="top"
              trigger={isTriggerTooltip()}
              overlay={hintPopup()}
            >
              <IconButton
                onClick={e => {
                  e.stopPropagation();
                  if (isEnableClick) {
                    setDeleteVolumeName(rowData.name);
                    setisDeleteConfirmationModalOpen(true);
                  }
                }}
                isEnableClick={isEnableClick}
              >
                <i className="fas fa-lg fa-trash" />
              </IconButton>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const onRowClick = row => {
    if (row.rowData && row.rowData.name) {
      props.history.push(
        `/nodes/${props.nodeName}/volumes/${row.rowData.name}`,
      );
    }
  };

  let volumeSortedList = props.data;
  if (sortBy === 'storageCapacity') {
    volumeSortedList = sortCapacity(volumeSortedList, sortBy, sortDirection);
  } else {
    volumeSortedList = sortSelector(volumeSortedList, sortBy, sortDirection);
  }

  const onClickDeleteButton = deleteVolumeName => {
    props.deleteVolume(deleteVolumeName);
    setisDeleteConfirmationModalOpen(false);
  };

  const onClickCancelButton = () => {
    setisDeleteConfirmationModalOpen(false);
  };

  return (
    <>
      <Modal
        close={() => setisDeleteConfirmationModalOpen(false)}
        isOpen={isDeleteConfirmationModalOpen}
        title={intl.messages.delete_a_volume}
        footer={
          <NotificationButtonGroup>
            <Button
              outlined
              text={intl.messages.cancel}
              onClick={onClickCancelButton}
            />
            <DeleteButton
              variant="danger"
              text={intl.messages.delete}
              onClick={e => {
                e.stopPropagation();
                onClickDeleteButton(deleteVolumeName);
              }}
            />
          </NotificationButtonGroup>
        }
      >
        <ModalBody>
          <div>{intl.messages.delete_a_volume_warning}</div>
          <div>
            {intl.messages.delete_a_volume_confirm}
            <strong>{deleteVolumeName}</strong>?
          </div>
        </ModalBody>
      </Modal>

      <ButtonContainer>
        <Button
          text={intl.messages.create_new_volume}
          type="button"
          onClick={() => {
            props.history.push('createVolume');
          }}
          data-cy="create-volume-button"
        />
        {volumes.isLoading && <Loader size="small" />}
      </ButtonContainer>
      <VolumeTable>
        <Table
          list={volumeSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={50}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={item => {
            onRowClick(item);
          }}
          noRowsRenderer={() =>
            searchedVolumeName === '' ? (
              <NoRowsRenderer content={intl.messages.no_volume_found} />
            ) : (
              <NoRowsRenderer
                content={intl.messages.no_searched_volume_found}
              />
            )
          }
        />
      </VolumeTable>
    </>
  );
};

const mapDispatchToProps = dispatch => {
  return {
    deleteVolume: deleteVolumeName =>
      dispatch(deleteVolumeAction(deleteVolumeName)),
  };
};

export default injectIntl(
  withRouter(
    connect(
      null,
      mapDispatchToProps,
    )(NodeVolumes),
  ),
);
