import React from 'react';
import styled from 'styled-components';
import { Loader as LoaderCoreUI } from '@scality/core-ui';

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const Loader = () => (
  <LoaderContainer>
    <LoaderCoreUI size="massive" />
  </LoaderContainer>
);

export default Loader;
