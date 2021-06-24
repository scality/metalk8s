import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { fetchClusterVersionAction } from '../ducks/app/nodes';
import { useIntl } from 'react-intl';

const Title = styled.h3`
  margin-top: 25px;
`;

const AboutContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 30px;
  flex-direction: column;
  align-items: center;
  color: ${(props) => props.theme.textPrimary};
`;

const About = (props) => {
  const clusterVersion = useSelector((state) => state.app.nodes.clusterVersion);
  const intl = useIntl();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchClusterVersionAction());
  }, [dispatch]);

  return (
    <AboutContainer>
      <Title>{intl.formatMessage({ id: 'product_name' })}</Title>
      {`${intl.formatMessage({ id: 'cluster_version' })}: ${clusterVersion}`}
    </AboutContainer>
  );
};

export default About;
