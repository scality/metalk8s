import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router';
import { Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

export const EmptyStateWrapper = styled.div`
  color: ${(props) => props.theme.brand.textSecondary};
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-top: 10%;
`;

export const BigText = styled.h3`
  text-align: center;
  margin: 0px;
`;

export const EmptyStateRow = styled.div`
  display: flex;
  justify-content: space-around;
  margin-bottom: ${padding.larger};
`;

export const ActionWrapper = styled.div`
  display: flex;
  justify-content: space-around;
`;

export const IconWrapper = styled.div`
  background-color: ${(props) => props.theme.brand.borderLight};
  color: ${(props) => props.theme.brand.background}
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 100%;
  width: 150px;
  height: 150px;

  i {
    &.fas {
      font-size: 4.5em;
    }
  }
`;

const EmptyState = (props) => {
  const { label, link, icon } = props;
  const history = useHistory();

  return (
    <EmptyStateWrapper>
      <EmptyStateRow>
        <IconWrapper>
          <i className={`fas ${icon}`}></i>
        </IconWrapper>
      </EmptyStateRow>
      <EmptyStateRow>
        <BigText>A list of {`${label}s`} will appear here</BigText>
      </EmptyStateRow>
      <EmptyStateRow>
        <BigText>
          There are no {`${label}s`} created yet, let's create your first{' '}
          {label}.
        </BigText>
      </EmptyStateRow>
      <ActionWrapper>
        <Button
          text={`Create ${label}`}
          size="large"
          icon={<i className="fas fa-plus"></i>}
          type="button"
          variant="secondary"
          onClick={() => history.push(link)}
        />
      </ActionWrapper>
    </EmptyStateWrapper>
  );
};

export default EmptyState;
