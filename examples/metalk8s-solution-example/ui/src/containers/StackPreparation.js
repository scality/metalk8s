//@flow
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { withRouter } from 'react-router-dom';

import { Loader as LoaderCoreUI } from '@scality/core-ui';
import { prepareStackAction } from '../ducks/app/stack';

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const StackPreparation = props => {
  const { match, intl, prepareStack } = props;
  const stackName = match.params.name;
  const stackVersion = match.params.version;

  useEffect(() => {
    prepareStack({ name: stackName, version: stackVersion });
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
    prepareStack: body => dispatch(prepareStackAction(body))
  };
};

export default injectIntl(
  withRouter(
    connect(
      null,
      mapDispatchToProps
    )(StackPreparation)
  )
);
