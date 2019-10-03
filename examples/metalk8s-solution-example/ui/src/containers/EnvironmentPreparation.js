//@flow
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { withRouter } from 'react-router-dom';

import { Loader as LoaderCoreUI } from '@scality/core-ui';
import { prepareEnvironmentAction } from '../ducks/app/environment';

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const EnvironmentPreparation = props => {
  const { match, intl, prepareEnvironment } = props;
  const environmentName = match.params.name;
  const environmentVersion = match.params.version;

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

const mapDispatchToProps = dispatch => {
  return {
    prepareEnvironment: body => dispatch(prepareEnvironmentAction(body))
  };
};

export default injectIntl(
  withRouter(
    connect(
      null,
      mapDispatchToProps
    )(EnvironmentPreparation)
  )
);
