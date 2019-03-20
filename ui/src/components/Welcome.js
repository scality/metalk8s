import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';

const Title = styled.h3`
  margin-top: 25px;
  text-align: center;
`;

const Welcome = () => (
  <Title>
    <FormattedMessage id="product_name" />
  </Title>
);

export default Welcome;
