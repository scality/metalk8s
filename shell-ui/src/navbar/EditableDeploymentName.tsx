import { Banner } from '@scality/core-ui/dist/components/banner/Banner.component';
import { Box } from '@scality/core-ui/dist/components/box/Box';
import { Button } from '@scality/core-ui/dist/components/buttonv2/Buttonv2.component';
import { InfoMessage } from '@scality/core-ui/dist/components/infomessage/InfoMessage.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { Modal } from '@scality/core-ui/dist/components/modal/Modal.component';
import { SecondaryText, Text } from '@scality/core-ui/dist/components/text/Text.component';
import { Tooltip } from '@scality/core-ui/dist/components/tooltip/Tooltip.component';
import { Stack, spacing } from '@scality/core-ui/dist/spacing';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { INSTANCE_NAME_QUERY_KEY, type InstanceNameAdapter } from './InstanceName';

function renameMutationErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An error occurred while updating the deployment name';
}

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

const ValidationInputWrapper = styled.div`
  position: relative;
`;

const ValidationError = styled.p`
  position: absolute;
  top: 100%;
  left: 0;
  margin: ${spacing.r4} 0 0;
  padding: ${spacing.r2} ${spacing.r8};
  font-size: 0.75rem;
  color: ${(props) => props.theme.statusCritical};
  background: ${(props) => props.theme.backgroundLevel1};
  border-radius: ${spacing.r4};
  white-space: nowrap;
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

  &[aria-invalid='true'] {
    border-color: ${(props) => props.theme.statusCritical};
    box-shadow: 0 0 0 2px ${(props) => props.theme.statusCritical}33;
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
  checkInstanceName,
  setInstanceName,
}: {
  name: string;
  checkInstanceName?: InstanceNameAdapter['checkInstanceName'];
  setInstanceName: (name: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [pendingName, setPendingName] = useState(name);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentName, setCurrentName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValidationError, setInputValidationError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isEditing) {
      setPendingName(name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, name]);

  const mutation = useMutation({
    mutationFn: async ({ value }: { value: string }) => {
      return setInstanceName(value);
    },
    onSuccess: () => {
      setModalOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries([INSTANCE_NAME_QUERY_KEY]);
    },
  });

  const isMutationLoading = mutation.isLoading;
  const showInputError = !!inputValidationError;

  const handleEditStart = () => {
    if (isMutationLoading) {
      return;
    }
    setIsEditing(true);
  };

  const submit = () => {
    const trimmed = pendingName.trim();
    const validationResult = checkInstanceName ? checkInstanceName(trimmed) : ({ hasError: false } as const);
    if (validationResult.hasError === true) {
      setInputValidationError(validationResult.message);
      return;
    }

    setInputValidationError(undefined);

    if (trimmed && trimmed !== name) {
      setIsEditing(false);
      setCurrentName(name);
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
    mutation.mutate({ value: pendingName.trim() });
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setInputValidationError(undefined);
    if (!mutation.isLoading) {
      mutation.reset();
    }
  };

  return (
    <>
      <Box gap={spacing.r4} style={{ alignItems: 'center' }}>
        {isEditing ? (
          <ValidationInputWrapper>
            <NameInput
              ref={inputRef}
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={submit}
              aria-label="Deployment name"
              aria-invalid={showInputError ? 'true' : 'false'}
            />
            {showInputError && inputValidationError && (
              <ValidationError id="name-error" role="alert">
                {inputValidationError}
              </ValidationError>
            )}
          </ValidationInputWrapper>
        ) : (
          <Tooltip
            overlay={isMutationLoading ? 'Cannot edit while propagating' : 'Edit deployment name'}
            placement="bottom"
          >
            <NameTrigger
              data-disabled={isMutationLoading || modalOpen ? 'true' : undefined}
              onClick={handleEditStart}
              role={isMutationLoading ? undefined : 'button'}
              tabIndex={isMutationLoading ? undefined : 0}
              onKeyDown={(e) => !isMutationLoading && e.key === 'Enter' && handleEditStart()}
            >
              {modalOpen ? pendingName.trim() : name}
              {isMutationLoading && (
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
            <Button
              variant="primary"
              label="Rename"
              onClick={handleConfirm}
              isLoading={isMutationLoading}
              disabled={isMutationLoading}
            />
          </Stack>
        }
      >
        <Stack direction="vertical" gap="r24" style={{ width: '500px' }}>
          {mutation.isError && mutation.error != null && (
            <Banner variant="danger" title="Error renaming deployment">
              {renameMutationErrorMessage(mutation.error)}
            </Banner>
          )}
          <InfoMessage
            title="About deployment names"
            content="The deployment name is a label for this instance, visible in the UI. It is auto-generated at installation. Renaming it early helps distinguish this deployment from others in multi-deployment environments."
          />
          <Text>Are you sure you want to rename this deployment?</Text>
          <KeyValueGrid>
            <KeyLabel>Current name</KeyLabel>
            <KeyValue>{currentName}</KeyValue>
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
