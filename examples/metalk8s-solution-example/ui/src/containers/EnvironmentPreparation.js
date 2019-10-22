//@flow
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { useRouteMatch } from 'react-router';

import { Loader as LoaderCoreUI } from '@scality/core-ui';
import { prepareEnvironmentAction } from '../ducks/app/environment';

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const EnvironmentPreparation = ({ intl }) => {
  const match = useRouteMatch();
  const environmentName = match.params.name;
  const environmentVersion = match.params.version;
  const dispatch = useDispatch();
  const prepareEnvironment = body => dispatch(prepareEnvironmentAction(body));

  useEffect(() => {
    prepareEnvironment({ name: environmentName, version: environmentVersion });
  }, []);

  return (
    <LoaderContainer>
      <LoaderCoreUI size="massive">
        {intl.messages.prepare_environment}.
      </LoaderCoreUI>
    </LoaderContainer>
  );
};

export default injectIntl(EnvironmentPreparation);
