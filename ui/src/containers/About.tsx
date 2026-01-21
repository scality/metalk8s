import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { fetchClusterVersionAction } from '../ducks/app/nodes';

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
  // @ts-expect-error - FIXME when you are working on it
  const clusterVersion = useSelector((state) => state.app.nodes.clusterVersion);
  const intl = useIntl();
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchClusterVersionAction());
  }, [dispatch]);
  return (
    <AboutContainer>
      <Title>
        {intl.formatMessage({
          id: 'product_name',
        })}
      </Title>
      {`${intl.formatMessage({
        id: 'cluster_version',
      })}: ${clusterVersion}`}
    </AboutContainer>
  );
};

export default About;
