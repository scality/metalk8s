//@flow
import React from 'react';
import styled from 'styled-components';
import { Loader as LoaderCoreUI } from '@scality/core-ui';
import type { Node } from 'react';

type Props = {
  children: Node,
};

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const Loader = (props: Props) => (
  <LoaderContainer>
    <LoaderCoreUI size="massive">{props.children}</LoaderCoreUI>
  </LoaderContainer>
);

export default Loader;
