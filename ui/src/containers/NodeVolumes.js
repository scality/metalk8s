import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { FormattedDate, FormattedTime } from 'react-intl';
import { withRouter } from 'react-router-dom';
import Modal from 'react-modal';
import Tooltip from '@material-ui/core/Tooltip';
import { Button, Table, Loader } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';
import {
  sortSelector,
  sortCapacity,
  useRefreshEffect
} from '../services/utils';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
  deleteVolumeAction
} from '../ducks/app/volumes';
import {
  STATUS_VOLUME_UNKNOWN,
  STATUS_TERMINATING,
  STATUS_PENDING,
  STATUS_FAILED,
  STATUS_AVAILABLE,
  STATUS_BOUND
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
`;

const DeleteConfirmationModal = {
  content: {
    top: '50%',
    left: '50%',
    width: '500px',
    transform: 'translate(-50%, -50%)'
  }
};

const NotificationButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${padding.larger};
  margin-left: 250px;
`;

const DeleteButton = styled(Button)`
  margin-left: ${padding.small};
`;

const NodeVolumes = props => {
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction
  );
  const volumes = useSelector(state => state.app.volumes);
  const persistentVolumes = useSelector(state => state.app.volumes.pVList);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const [
    isDeleteConfirmationModalOpen,
    setisDeleteConfirmationModalOpen
  ] = useState(false);
  const [deleteVolumeName, setDeleteVolumeName] = useState('');
  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const isVolumeDeletable = rowData => {
    const volumeStatus = rowData.status;
    const volumeName = rowData.name;
    setDeleteVolumeName(rowData.name);
    if (
      volumeStatus === STATUS_VOLUME_UNKNOWN ||
      volumeStatus === STATUS_PENDING ||
      volumeStatus === STATUS_TERMINATING
    ) {
      return false;
    } else if (
      volumeStatus === STATUS_FAILED ||
      volumeStatus === STATUS_AVAILABLE
    ) {
      if (persistentVolumes === []) {
        return true;
      } else {
        const persistentVolume = persistentVolumes.find(
          pv => pv?.metadata?.name === volumeName
        );
        const persistentVolumeStatus = persistentVolume?.status?.phase;
        if (
          persistentVolumeStatus === STATUS_BOUND ||
          persistentVolumeStatus === STATUS_AVAILABLE
        ) {
          return true;
        } else if (persistentVolumeStatus === STATUS_PENDING) {
          return false;
        } else {
          return true;
        }
      }
    }
  };

  const columns = [
    {
      label: props.intl.messages.name,
      dataKey: 'name'
    },
    {
      label: props.intl.messages.status,
      dataKey: 'status'
    },
    {
      label: props.intl.messages.storageCapacity,
      dataKey: 'storageCapacity'
    },
    {
      label: props.intl.messages.storageClass,
      dataKey: 'storageClass'
    },
    {
      label: props.intl.messages.creationTime,
      dataKey: 'creationTime',
      flexGrow: 1,
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
      )
    },
    {
      label: 'Action',
      dataKey: 'action-test',
      disableSort: true,
      width: 80,
      renderer: (data, rowData) => {
        const isEnableClick = isVolumeDeletable(rowData);
        const CustI = styled.i`
          cursor: ${props => {
            if (props.isEnableClick) {
              return `pointer`;
            } else {
              return `not-allowed`;
            }
          }};
        `;
        return (
          <div>
            <Tooltip
              title="Why it cannot be deleted?"
              onClick={e => {
                e.stopPropagation();
                if (isEnableClick) {
                  setisDeleteConfirmationModalOpen(true);
                }
              }}
              disableHoverListener={isEnableClick}
            >
              <CustI className="fas fa-trash" isEnableClick={isEnableClick} />
            </Tooltip>
          </div>
        );
      }
    }
  ];
  const onRowClick = row => {
    if (row.rowData && row.rowData.name) {
      props.history.push(
        `/nodes/${props.nodeName}/volumes/${row.rowData.name}`
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
        isOpen={isDeleteConfirmationModalOpen}
        ariaHideApp={false}
        style={DeleteConfirmationModal}
      >
        <h2>Delete a volume</h2>
        <div>
          Deleting this volume will permanently delete the data it contains.
        </div>
        <div>Do you want to delete {deleteVolumeName}?</div>
        <NotificationButtonGroup>
          <Button outlined text="Cancel" onClick={onClickCancelButton} />
          <DeleteButton
            variant="danger"
            text="Delete"
            onClick={e => {
              e.stopPropagation();
              onClickDeleteButton(deleteVolumeName);
            }}
          />
        </NotificationButtonGroup>
      </Modal>
      <ButtonContainer>
        <Button
          text={props.intl.messages.create_new_volume}
          type="button"
          onClick={() => {
            props.history.push('createVolume');
          }}
        />
        {volumes.isLoading && <Loader size="small" />}
      </ButtonContainer>
      <VolumeTable>
        <Table
          list={volumeSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={item => {
            onRowClick(item);
          }}
          noRowsRenderer={() => (
            <NoRowsRenderer content={props.intl.messages.no_volume_found} />
          )}
        />
      </VolumeTable>
    </>
  );
};

const mapDispatchToProps = dispatch => {
  return {
    deleteVolume: deleteVolumeName =>
      dispatch(deleteVolumeAction(deleteVolumeName))
  };
};

export default injectIntl(
  withRouter(
    connect(
      null,
      mapDispatchToProps
    )(NodeVolumes)
  )
);
