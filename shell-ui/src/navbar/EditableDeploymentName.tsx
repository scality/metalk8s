import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@scality/core-ui/dist/components/modal/Modal.component';
import { Text } from '@scality/core-ui/dist/components/text/Text.component';
import { Stack } from '@scality/core-ui/dist/spacing';
import { Tooltip } from '@scality/core-ui/dist/components/tooltip/Tooltip.component';
import { InfoMessage } from '@scality/core-ui/dist/components/infomessage/InfoMessage.component';
import { SecondaryText } from '@scality/core-ui/dist/components/text/Text.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { Button } from '@scality/core-ui/dist/components/buttonv2/Buttonv2.component';
import { Box } from '@scality/core-ui/dist/components/box/Box';

import { spacing } from '@scality/core-ui/dist/spacing';

const ModalDivider = styled.hr`
  border: none;
  border-top: 1px solid ${(props) => props.theme.backgroundLevel3};
  margin: 0;
`;

const InlineLoaderWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  svg {
    width: 1.25em;
    height: 1.25em;
  }
`;

const NameInput = styled.input`
  font-size: 1rem;
  font-family: 'Lato';
  color: ${(props) => props.theme.textPrimary};
  background: ${(props) => props.theme.backgroundLevel2};
  border: 1px solid ${(props) => props.theme.infoPrimary};
  border-radius: ${spacing.r4};
  padding: ${spacing.r4} ${spacing.r8};
  outline: none;
  min-width: 180px;

  &:focus {
    border-color: ${(props) => props.theme.selectedActive};
    box-shadow: 0 0 0 2px ${(props) => props.theme.selectedActive}33;
  }
`;

const KeyValueGrid = styled.dl`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: ${spacing.r8} ${spacing.r16};
  margin: 0;
`;

const KeyLabel = styled.dt`
  color: ${(props) => props.theme.textSecondary};
  margin: 0;
`;

const KeyValue = styled.dd`
  color: ${(props) => props.theme.textPrimary};
  margin: 0;
`;

/** Pill around deployment name: typography + interactive hover chrome */
const NameTrigger = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.r4};
  padding: ${spacing.r4} ${spacing.r8};
  border-radius: ${spacing.r16};
  border: 1px solid transparent;
  background: ${(props) => props.theme.backgroundLevel3};
  font-size: 1rem;
  font-family: 'Lato';
  color: ${(props) => props.theme.textPrimary};
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, opacity 0.15s ease;

  &[data-disabled='true'] {
    opacity: 0.6;
  }

  &:not([data-disabled='true']):hover {
    border-color: ${(props) => props.theme.infoPrimary};
    background: ${(props) => props.theme.highlight};
  }
`;

export function EditableDeploymentName({
  name,
  isPropagating,
  onChange,
}: {
  name: string;
  isPropagating: boolean;
  onChange: (newName: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [pendingName, setPendingName] = useState(name);
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setPendingName(name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, name]);

  const handleEditStart = () => {
    if (isPropagating) {
      return;
    }
    setIsEditing(true);
  };

  const submit = () => {
    const trimmed = pendingName.trim();
    if (trimmed && trimmed !== name) {
      setIsEditing(false);
      setModalOpen(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleConfirm = () => {
    onChange(pendingName.trim());
    setModalOpen(false);
  };

  const handleModalCancel = () => {
    setModalOpen(false);
  };

  return (
    <>
      <Box gap={spacing.r4} style={{ alignItems: 'center' }}>
        {isEditing ? (
          <NameInput
            ref={inputRef}
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={submit}
            aria-label="Deployment name"
          />
        ) : (
          <Tooltip
            overlay={isPropagating ? 'Cannot edit while propagating' : 'Edit deployment name'}
            placement="bottom"
          >
            <NameTrigger
              data-disabled={isPropagating || modalOpen ? 'true' : undefined}
              onClick={handleEditStart}
              role={isPropagating ? undefined : 'button'}
              tabIndex={isPropagating ? undefined : 0}
              onKeyDown={(e) => !isPropagating && e.key === 'Enter' && handleEditStart()}
            >
              {modalOpen ? pendingName.trim() : name}
              {isPropagating && (
                <InlineLoaderWrapper>
                  <Loader size="smaller" />
                </InlineLoaderWrapper>
              )}
            </NameTrigger>
          </Tooltip>
        )}
      </Box>

      <Modal
        isOpen={modalOpen}
        close={handleModalCancel}
        title="Rename deployment?"
        footer={
          <Stack gap="r8" direction="horizontal" style={{ justifyContent: 'flex-end' }}>
            <Button variant="outline" label="Cancel" onClick={handleModalCancel} />
            <Button variant="primary" label="Rename" onClick={handleConfirm} />
          </Stack>
        }
      >
        <Stack direction="vertical" gap="r24" style={{ width: '500px' }}>
          <InfoMessage
            title="About deployment names"
            content="The deployment name is a label for this instance, visible in the UI. It is auto-generated at installation. Renaming it early helps distinguish this deployment from others in multi-deployment environments."
          />
          <Text>Are you sure you want to rename this deployment?</Text>
          <KeyValueGrid>
            <KeyLabel>Current name</KeyLabel>
            <KeyValue>{name}</KeyValue>
            <KeyLabel>New name</KeyLabel>
            <KeyValue>{pendingName.trim()}</KeyValue>
          </KeyValueGrid>
          <ModalDivider />
          <Text style={{ fontStyle: 'italic' }}>
            <SecondaryText>This change may take a few minutes to propagate across all services.</SecondaryText>
          </Text>
        </Stack>
      </Modal>
    </>
  );
}
