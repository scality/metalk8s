import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { FormattedDate, FormattedTime } from 'react-intl';
import { useHistory } from 'react-router';
import {
  Button,
  Table,
  Loader,
  Modal,
  SearchInput,
  Tooltip,
} from '@scality/core-ui';
import { padding, grayLight } from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';
import {
  sortSelector,
  sortCapacity,
  useRefreshEffect,
} from '../services/utils';
import { isVolumeDeletable } from '../services/NodeVolumesUtils';
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
  STATUS_BOUND,
  STATUS_READY,
} from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

const VolumeTable = styled.div`
  flex-grow: 1;
  margin-top: ${padding.small};
  /* solve the tooltip display issue */
  .sc-table-column-cell-action {
    overflow: visible !important;
  }
  .remove-volume-button:disabled {
    color: ${grayLight};
    pointer-events: all;
    cursor: not-allowed;
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

const ActionContainer = styled.div`
  margin-top: ${padding.small};
  display: flex;
  justify-content: space-between;
`;

const SearchContainer = styled.div`
  margin-left: ${padding.base};
  input.sc-input-type {
    background-color: ${(props) => props.theme.brand.primaryDark2};
  }
  width: 250px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  .sc-tooltip-overlay-text {
    white-space: nowrap;
    letter-spacing: 0.8px;
  }
`;

const LoaderContainer = styled(Loader)`
  padding-right: ${padding.smaller};
`;

const TrashButtonContainer = styled(Button)`
  ${(props) => {
    if (props.disabled) return { opacity: 0.2 };
  }};
`;

const NodeVolumes = (props) => {
  const dispatch = useDispatch();
  const deleteVolume = (deleteVolumeName) =>
    dispatch(deleteVolumeAction(deleteVolumeName));
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  const history = useHistory();

  const volumes = useSelector((state) => state.app.volumes);
  const persistentVolumes = useSelector((state) => state.app.volumes.pVList);
  const [searchedVolumeName, setSearchedVolumeName] = useState('');
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
  const columns = [
    {
      label: intl.translate('name'),
      dataKey: 'name',
      flexGrow: 1,
    },
    {
      label: intl.translate('status'),
      dataKey: 'status',
    },
    {
      label: intl.translate('bound'),
      dataKey: 'bound',
    },
    {
      label: intl.translate('storageCapacity'),
      dataKey: 'storageCapacity',
    },
    {
      label: intl.translate('storageClass'),
      dataKey: 'storageClass',
    },
    {
      label: intl.translate('creationTime'),
      dataKey: 'creationTime',
      renderer: (data) => (
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
      label: intl.translate('action'),
      dataKey: 'action',
      disableSort: true,
      width: 150,
      renderer: (data, rowData) => {
        const isEnableClick = isVolumeDeletable(
          rowData.status,
          rowData.name,
          persistentVolumes,
        );

        const hintPopup = () => {
          let hintMessage = '';

          switch (rowData.status) {
            case STATUS_PENDING:
              hintMessage = intl.translate('volume_status_pending_hint');
              break;
            case STATUS_TERMINATING:
              hintMessage = intl.translate('volume_status_terminating_hint');
              break;
            case STATUS_UNKNOWN:
              hintMessage = intl.translate('volume_status_unknown_hint');
              break;
            case STATUS_FAILED:
            case STATUS_READY:
              const persistentVolume = persistentVolumes.find(
                (pv) => pv?.metadata?.name === rowData.name,
              );
              const persistentVolumeStatus = persistentVolume?.status?.phase;
              switch (persistentVolumeStatus) {
                case STATUS_BOUND:
                  hintMessage = intl.translate(
                    'volume_statue_failed_pv_bound_hint',
                  );
                  break;
                case STATUS_PENDING:
                  hintMessage = intl.translate(
                    'volume_status_failed_pv_pending_hint',
                  );
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
          <>
            <Tooltip placement="bottom" overlay={hintPopup()}>
              <TrashButtonContainer
                className="remove-volume-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEnableClick) {
                    setDeleteVolumeName(rowData.name);
                    setisDeleteConfirmationModalOpen(true);
                  }
                }}
                inverted={true}
                icon={<i className="fas fa-lg fa-trash" />}
                disabled={!isEnableClick}
              ></TrashButtonContainer>
            </Tooltip>
          </>
        );
      },
    },
  ];

  const onRowClick = (row) => {
    if (row.rowData && row.rowData.name) {
      history.push(
        `/volumes/?node=${props.nodeName}&volume=${row.rowData.name}`,
      );
    }
  };

  const volumeDataList = props.data;

  let volumeSortedList = volumeDataList.filter((volume) =>
    volume.name.includes(searchedVolumeName),
  );

  if (sortBy === 'storageCapacity') {
    volumeSortedList = sortCapacity(volumeSortedList, sortBy, sortDirection);
  } else {
    volumeSortedList = sortSelector(volumeSortedList, sortBy, sortDirection);
  }

  const onClickDeleteButton = (deleteVolumeName) => {
    deleteVolume(deleteVolumeName);
    setisDeleteConfirmationModalOpen(false);
  };

  const onClickCancelButton = () => {
    setisDeleteConfirmationModalOpen(false);
  };

  const handleChange = (e) => {
    setSearchedVolumeName(e.target.value);
  };

  return (
    <>
      <Modal
        close={() => setisDeleteConfirmationModalOpen(false)}
        isOpen={isDeleteConfirmationModalOpen}
        title={intl.translate('delete_volume')}
        footer={
          <NotificationButtonGroup>
            <Button
              outlined
              text={intl.translate('cancel')}
              onClick={onClickCancelButton}
            />
            <DeleteButton
              variant="danger"
              text={intl.translate('delete')}
              onClick={(e) => {
                e.stopPropagation();
                onClickDeleteButton(deleteVolumeName);
              }}
            />
          </NotificationButtonGroup>
        }
      >
        <ModalBody>
          <div>{intl.translate('delete_a_volume_warning')}</div>
          <div>
            {intl.translate('delete_a_volume_confirm')}
            <strong>{deleteVolumeName}</strong>?
          </div>
        </ModalBody>
      </Modal>

      <ActionContainer>
        <SearchContainer>
          <SearchInput
            value={searchedVolumeName}
            placeholder={intl.translate('search')}
            disableToggle={true}
            onChange={handleChange}
          ></SearchInput>
        </SearchContainer>

        <ButtonContainer>
          {volumes.isLoading && <LoaderContainer size="small" />}
          <Tooltip
            placement="left"
            overlay={intl.translate('create_new_volume')}
          >
            <Button
              text={<i className="fas fa-plus "></i>}
              type="button"
              onClick={() => {
                history.push('createVolume');
              }}
              data-cy="create-volume-button"
            />
          </Tooltip>
        </ButtonContainer>
      </ActionContainer>

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
          onRowClick={(item) => {
            onRowClick(item);
          }}
          noRowsRenderer={() =>
            searchedVolumeName === '' ? (
              <NoRowsRenderer content={intl.translate('no_volume_found')} />
            ) : (
              <NoRowsRenderer
                content={intl.translate('no_searched_volume_found')}
              />
            )
          }
        />
      </VolumeTable>
    </>
  );
};

export default NodeVolumes;
