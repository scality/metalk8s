import React from 'react';
import styled from 'styled-components';
import { fontSize } from '@scality/core-ui/dist/style/theme';

const NoRowsSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: ${fontSize.large};
`;

const NoRowsRenderer = ({ content }) => {
  return <NoRowsSection>{content}</NoRowsSection>;
};

export default NoRowsRenderer;
