import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useHistory } from 'react-router';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled, { useTheme } from 'styled-components';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import CircleStatus from './CircleStatus';
import ActiveAlertsCounter from './ActiveAlertsCounter';
import { isVolumeDeletable } from '../services/NodeVolumesUtils';
import { deleteVolumeAction } from '../ducks/app/volumes';
import {
  VOLUME_CONDITION_LINK,
  STATUS_CRITICAL,
  STATUS_WARNING,
  LVM_LOGICAL_VOLUME,
} from '../constants';
import { Modal, ProgressBar, Loader } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { VolumeTab } from './style/CommonLayoutStyle';
import { formatSizeForDisplay } from '../services/utils';

const VolumeDetailCardContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const VolumeTitleSection = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: ${padding.large} ${padding.base} ${padding.larger} ${padding.large};
  display: flex;
  justify-content: space-between;
`;

const VolumeName = styled.span`
  font-size: ${fontSize.larger};
  padding-left: ${padding.smaller};
`;

const InformationSpan = styled.div`
  padding-bottom: ${padding.large};
  padding-left: ${padding.large};
  display: flex;
`;

const InformationLabel = styled.span`
  display: inline-block;
  min-width: 7rem;
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.base};
  color: ${(props) => props.theme.textSecondary};
`;

const InformationValue = styled.span`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
`;

const ClickableInformationValue = styled.span`
  color: ${(props) => props.theme.selectedActive};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.semibold};
  cursor: pointer;
`;

const VolumeGraph = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 2%;
  padding-right: ${padding.larger};
`;

const VolumeUsage = styled.div`
  min-height: 94px;
  margin: ${padding.large} ${padding.small} ${padding.large} 0;
  padding: 0 ${padding.base} 0 0;
`;

const VolumeSectionTitle = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: 0 0 ${padding.base} 0;
`;

const ProgressBarContainer = styled.div`
  margin: ${padding.small};
`;

const NotificationButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const ModalBody = styled.div`
  padding-bottom: ${padding.base};
`;

const CancelButton = styled(Button)`
  margin-right: ${padding.small};
`;
const LoaderContainer = styled(Loader)`
  padding-left: ${padding.small};
`;

const LabelName = styled.span`
  font-size: ${fontSize.small};
  color: ${(props) => props.theme.textPrimary};
  padding-right: ${padding.base};
`;
const LabelValue = styled.span`
  font-size: ${fontSize.small};
  color: ${(props) => props.theme.textPrimary};
`;

const AlertsCounterContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 200px;
`;

const VolumeDetailCard = (props) => {
  const {
    name,
    nodeName,
    storage,
    status,
    storageClassName,
    creationTimestamp,
    volumeType,
    usedPodName,
    devicePath,
    vgName,
    volumeUsagePercentage,
    volumeUsageBytes,
    storageCapacity,
    condition,
    volumeListData,
    pVList,
    health,
    alertlist,
  } = props;

  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const intl = useIntl();
  const query = new URLSearchParams(location.search);
  const theme = useTheme();

  const deleteVolume = (deleteVolumeName) =>
    dispatch(deleteVolumeAction(deleteVolumeName));
  const [
    isDeleteConfirmationModalOpen,
    setisDeleteConfirmationModalOpen,
  ] = useState(false);

  // Confirm the deletion
  const onClickDeleteButton = (deleteVolumeName, nodeName) => {
    const isAddNodefilter = query.has('node');

    deleteVolume(deleteVolumeName);
    setisDeleteConfirmationModalOpen(false);

    let hightvolumeName;
    if (volumeListData[0]?.name === deleteVolumeName) {
      // delete the first volume
      hightvolumeName = volumeListData[1]?.name;
    } else {
      // after the deletion, automatically select the first volume
      hightvolumeName = volumeListData[0]?.name;
    }
    if (isAddNodefilter && hightvolumeName) {
      history.push(`/volumes/${hightvolumeName}/overview?node=${nodeName}`);
    } else if (!isAddNodefilter && hightvolumeName) {
      history.push(`/volumes/${hightvolumeName}/overview`);
    } else if (isAddNodefilter && !hightvolumeName) {
      history.push(`/volumes/?node=${nodeName}`);
    } else {
      history.push('/volumes');
    }
  };

  const onClickNodeName = () => {
    history.push(`/nodes/${nodeName}/overview`);
  };

  const onClickCancelButton = () => {
    setisDeleteConfirmationModalOpen(false);
  };

  const isEnableClick = isVolumeDeletable(status, name, pVList);

  const pV = pVList.find((pv) => pv.metadata.name === name);
  const labels = pV?.metadata?.labels //persistent Volume labels
    ? Object.keys(pV.metadata.labels).map((key) => {
        return {
          name: key,
          value: pV.metadata.labels[key],
        };
      })
    : [];

  return (
    <VolumeTab>
      <VolumeTitleSection data-cy="volume_detail_card_name">
        <div>
          <CircleStatus className="fas fa-circle" status={health} />
          <VolumeName>{name}</VolumeName>
        </div>
        <Button
          variant="danger"
          icon={<i className="fas fa-sm fa-trash" />}
          label={intl.formatMessage({ id: 'delete_volume' })}
          onClick={(e) => {
            e.stopPropagation();
            setisDeleteConfirmationModalOpen(true);
          }}
          disabled={!isEnableClick}
          data-cy="delete_volume_button"
        />
      </VolumeTitleSection>
      <VolumeDetailCardContainer>
        <div>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'node' })}
            </InformationLabel>
            <ClickableInformationValue onClick={onClickNodeName}>
              {nodeName}
            </ClickableInformationValue>
          </InformationSpan>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'size' })}
            </InformationLabel>
            <InformationValue data-cy="volume_size_value">
              {formatSizeForDisplay(storage)}
            </InformationValue>
          </InformationSpan>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'status' })}
            </InformationLabel>
            <InformationValue data-cy="volume_status_value">
              {status}
            </InformationValue>
          </InformationSpan>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'storageClass' })}
            </InformationLabel>
            <InformationValue>{storageClassName}</InformationValue>
          </InformationSpan>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'creationTime' })}
            </InformationLabel>
            {creationTimestamp ? (
              <InformationValue>
                <FormattedDate
                  value={creationTimestamp}
                  year="numeric"
                  month="short"
                  day="2-digit"
                />{' '}
                <FormattedTime
                  hour="2-digit"
                  minute="2-digit"
                  second="2-digit"
                  value={creationTimestamp}
                />
              </InformationValue>
            ) : (
              ''
            )}
          </InformationSpan>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'volume_type' })}
            </InformationLabel>
            <InformationValue>{volumeType}</InformationValue>
          </InformationSpan>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'used_by' })}
            </InformationLabel>
            <InformationValue>{usedPodName}</InformationValue>
          </InformationSpan>
          <InformationSpan>
            {volumeType !== LVM_LOGICAL_VOLUME ? (
              <>
                <InformationLabel data-cy="backend_disk_label">
                  {intl.formatMessage({ id: 'backend_disk' })}
                </InformationLabel>
                <InformationValue data-cy="backend_disk_value">
                  {devicePath}
                </InformationValue>
              </>
            ) : (
              <>
                <InformationLabel data-cy="vg_name_label">
                  VG Name
                </InformationLabel>
                <InformationValue data-cy="vg_name_value">
                  {vgName}
                </InformationValue>
              </>
            )}
          </InformationSpan>
          <InformationSpan>
            <InformationLabel>
              {intl.formatMessage({ id: 'labels' })}
            </InformationLabel>
            <InformationValue>
              {labels?.map((label) => {
                return (
                  <div key={label.name}>
                    <LabelName data-cy="volume_label_name">
                      {label.name}
                    </LabelName>
                    <LabelValue data-cy="volume_label_value">
                      {label.value}
                    </LabelValue>
                  </div>
                );
              })}
            </InformationValue>
          </InformationSpan>
        </div>

        <VolumeGraph>
          {alertlist && (
            <AlertsCounterContainer>
              <VolumeSectionTitle>
                {intl.formatMessage({ id: 'active_alerts' })}
              </VolumeSectionTitle>
              <ActiveAlertsCounter
                criticalCounter={
                  alertlist?.filter(
                    (item) => item?.labels?.severity === STATUS_CRITICAL,
                  ).length
                }
                warningCounter={
                  alertlist?.filter(
                    (item) => item?.labels?.severity === STATUS_WARNING,
                  ).length
                }
              />
            </AlertsCounterContainer>
          )}
          {condition === VOLUME_CONDITION_LINK && (
            <VolumeUsage>
              <VolumeSectionTitle>
                {intl.formatMessage({ id: 'usage' })}
              </VolumeSectionTitle>
              {volumeUsagePercentage !==
              intl.formatMessage({ id: 'unknown' }) ? (
                <ProgressBarContainer>
                  <ProgressBar
                    size="large"
                    percentage={volumeUsagePercentage}
                    topRightLabel={`${volumeUsagePercentage}%`}
                    bottomLeftLabel={`${volumeUsageBytes} USED`}
                    bottomRightLabel={`${formatSizeForDisplay(
                      storageCapacity,
                    )} TOTAL`}
                    color={theme.infoSecondary}
                    backgroundColor={theme.buttonSecondary}
                  />
                </ProgressBarContainer>
              ) : (
                <LoaderContainer size="small" />
              )}
            </VolumeUsage>
          )}
        </VolumeGraph>
        <Modal
          close={() => setisDeleteConfirmationModalOpen(false)}
          isOpen={isDeleteConfirmationModalOpen}
          title={intl.formatMessage({ id: 'delete_volume' })}
          footer={
            <NotificationButtonGroup>
              <CancelButton
                variant="outline"
                label={intl.formatMessage({ id: 'cancel' })}
                onClick={onClickCancelButton}
              />
              <Button
                variant="danger"
                label={intl.formatMessage({ id: 'delete' })}
                onClick={() => {
                  onClickDeleteButton(name, nodeName);
                }}
                data-cy="confirm_deletion_button"
              />
            </NotificationButtonGroup>
          }
        >
          <ModalBody>
            <div>{intl.formatMessage({ id: 'delete_a_volume_warning' })}</div>
            <div>
              {intl.formatMessage({ id: 'delete_a_volume_confirm' })}
              <strong>{name}</strong>?
            </div>
          </ModalBody>
        </Modal>
      </VolumeDetailCardContainer>
    </VolumeTab>
  );
};

export default VolumeDetailCard;
