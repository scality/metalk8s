import React from 'react';
import styled from 'styled-components';
import { FormattedMessage, injectIntl } from 'react-intl';
import { connect } from 'react-redux';

const Title = styled.h3`
  margin-top: 25px;
`;

const AboutContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 30px;
  flex-direction: column;
  align-items: center;
`;

const About = props => (
  <AboutContainer>
    <Title>
      <FormattedMessage id="product_name" />
    </Title>
    {`${props.intl.messages.cluster_version}: ${props.clusterVersion}`}
  </AboutContainer>
);

const mapStateToProps = state => ({
  clusterVersion: state.app.nodes.clusterVersion
});

export default injectIntl(connect(mapStateToProps)(About));
