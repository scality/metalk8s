import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import { deleteVolumeAction } from '../ducks/app/volumes';
import { VOLUME_CONDITION_LINK } from '../constants';
import { Button, Modal, ProgressBar } from '@scality/core-ui';
import { intl } from '../translations/IntlGlobalProvider';

const VolumeDetailCardContainer = styled.div`
  display: flex;
  background-color: ${(props) => props.theme.brand.primaryDark1};
  min-height: 270px;
  margin: ${padding.small};
`;

const VolumeInformation = styled.div`
  width: 40vw;
`;

const VolumeNameTitle = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.large};
  padding: ${padding.small} 0 ${padding.small} ${padding.large};
`;

const InformationSpan = styled.div`
  padding-bottom: 7px;
  padding-left: ${padding.large};
  display: flex;
`;

const InformationLabel = styled.span`
  display: inline-block;
  min-width: 150px;
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.base};
  color: ${(props) => props.theme.brand.textSecondary};
`;

const InformationValue = styled.span`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
`;

const DeleteButton = styled(Button)`
  margin-right: 100px;
  width: 165px;
  height: 30px;
  font-size: ${fontSize.small};
  background-color: ${(props) => props.theme.brand.critical};
`;

const DeleteButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  padding-bottom: ${padding.base};
`;

const VolumeGraph = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const VolumeUsage = styled.div`
  min-height: 94px;
  background-color: ${(props) => props.theme.brand.primary};
  margin: ${padding.large} ${padding.small} ${padding.large} 0;
  padding: 0 ${padding.base} 0 0;
`;

const VolumeUsageTitle = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: ${padding.small} 0 ${padding.base} ${padding.small};
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
    volumeUsagePercentage,
    volumeUsageBytes,
    storageCapacity,
    condition,
  } = props;

  const dispatch = useDispatch();
  const deleteVolume = (deleteVolumeName) =>
    dispatch(deleteVolumeAction(deleteVolumeName));
  const [
    isDeleteConfirmationModalOpen,
    setisDeleteConfirmationModalOpen,
  ] = useState(false);
  // Confirm the deletion
  const onClickDeleteButton = (deleteVolumeName) => {
    deleteVolume(deleteVolumeName);
    setisDeleteConfirmationModalOpen(false);
  };

  const onClickCancelButton = () => {
    setisDeleteConfirmationModalOpen(false);
  };

  return (
    <VolumeDetailCardContainer>
      <VolumeInformation>
        <VolumeNameTitle>{name}</VolumeNameTitle>
        <InformationSpan>
          <InformationLabel>{intl.translate('node')}</InformationLabel>
          <InformationValue>{nodeName}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.translate('size')}</InformationLabel>
          <InformationValue>{storage}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.translate('status')}</InformationLabel>
          <InformationValue>{status}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.translate('storageClass')}</InformationLabel>
          <InformationValue>{storageClassName}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.translate('creationTime')}</InformationLabel>
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
          <InformationLabel>{intl.translate('volume_type')}</InformationLabel>
          <InformationValue>{volumeType}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.translate('used_by')}</InformationLabel>
          <InformationValue>{usedPodName}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.translate('backend_disk')}</InformationLabel>
          <InformationValue>{devicePath}</InformationValue>
        </InformationSpan>
      </VolumeInformation>

      <VolumeGraph>
        {condition === VOLUME_CONDITION_LINK && (
          <VolumeUsage>
            <VolumeUsageTitle>Volume Usage</VolumeUsageTitle>
            <ProgressBarContainer>
              <ProgressBar
                size="base"
                percentage={volumeUsagePercentage}
                topRightLabel={`${volumeUsagePercentage}%`}
                bottomLeftLabel={`${volumeUsageBytes} USED`}
                bottomRightLabel={`${storageCapacity} TOTAL`}
              />
            </ProgressBarContainer>
          </VolumeUsage>
        )}
        <DeleteButtonContainer>
          <DeleteButton
            icon={<i className="fas fa-sm fa-trash" />}
            text={intl.translate('delete_volume')}
            onClick={(e) => {
              e.stopPropagation();
              setisDeleteConfirmationModalOpen(true);
            }}
          />
        </DeleteButtonContainer>
      </VolumeGraph>
      <Modal
        close={() => setisDeleteConfirmationModalOpen(false)}
        isOpen={isDeleteConfirmationModalOpen}
        title={intl.translate('delete_volume')}
        footer={
          <NotificationButtonGroup>
            <CancelButton
              outlined
              text={intl.translate('cancel')}
              onClick={onClickCancelButton}
            />
            <Button
              variant="danger"
              text={intl.translate('delete')}
              onClick={(e) => {
                e.stopPropagation();
                onClickDeleteButton(name);
              }}
            />
          </NotificationButtonGroup>
        }
      >
        <ModalBody>
          <div>{intl.translate('delete_a_volume_warning')}</div>
          <div>
            {intl.translate('delete_a_volume_confirm')}
            <strong>{name}</strong>?
          </div>
        </ModalBody>
      </Modal>
    </VolumeDetailCardContainer>
  );
};

export default VolumeDetailCard;
