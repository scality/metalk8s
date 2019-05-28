import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { createSelector } from 'reselect';
import styled from 'styled-components';
import ReactJson from 'react-json-view';
import { Button, Loader } from 'core-ui';
import { withRouter } from 'react-router-dom';

import { subscribeDeployEventsAction } from '../ducks/app/nodes';
import { getJobStatusFromEventRet } from '../../src/services/salt/utils';
import {
  fontWeight,
  grayLightest,
  padding,
  fontSize,
  brand
} from 'core-ui/dist/style/theme';

const NodeDeploymentContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: ${padding.larger};
  overflow: auto;
`;

const NodeDeploymentTitle = styled.div`
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.large};
`;

const NodeDeploymentContent = styled.div`
  background-color: ${grayLightest};
  padding: ${padding.base};
  margin: ${padding.base};
  border-radius: 5px;
`;

const NodeDeploymentWrapper = styled.div`
  padding: ${padding.base};
`;

const NodeDeploymentStatus = styled.div`
  padding: ${padding.base};
`;

const SuccessLabel = styled.span`
  color: ${brand.success};
`;

const ErrorLabel = styled.span`
  color: ${brand.danger};
`;

function NodeDeploymentResult(props) {
  return (
    <span>
      {props.intl.messages.status} :
      {props.status.success ? (
        <SuccessLabel>{props.intl.messages.success}</SuccessLabel>
      ) : (
        <ErrorLabel>
          `{props.intl.messages.error}: ${props.status.step_id} - $
          {props.status.comment}`
        </ErrorLabel>
      )}
    </span>
  );
}

function NodeDeployment(props) {
  useEffect(() => {
    if (props && props.match && props.match.params && props.match.params.id) {
      props.subscribeDeployEvents(props.match.params.id);
    }
  });

  const getJobResult = () => {
    const result = props.events.find(event => event.tag.includes('/ret'));
    if (result) {
      return getJobStatusFromEventRet(result.data);
    }
    return null;
  };

  return (
    <NodeDeploymentContainer>
      <div>
        <Button
          text={props.intl.messages.back_to_node_list}
          type="button"
          outlined
          onClick={() => props.history.push('/nodes')}
          icon={<i className="fas fa-arrow-left" />}
        />
      </div>
      <NodeDeploymentWrapper>
        <NodeDeploymentTitle>
          {props.intl.messages.node_deployment}
        </NodeDeploymentTitle>
        <NodeDeploymentStatus>
          {getJobResult() ? (
            <NodeDeploymentResult status={getJobResult()} />
          ) : (
            <Loader>{props.intl.messages.deploying}</Loader>
          )}
        </NodeDeploymentStatus>

        <NodeDeploymentContent>
          <ReactJson src={props.events} name={props.match.params.id} />
        </NodeDeploymentContent>
      </NodeDeploymentWrapper>
    </NodeDeploymentContainer>
  );
}

const mapStateToProps = (state, ownProps) => ({
  events: makegGetNodeDeploymentFromUrl(state, ownProps)
});

const getNodeDeploymentFromUrl = (state, props) => {
  const events = state.app.nodes.events || {};
  if (props && props.match && props.match.params && props.match.params.id) {
    return events[props.match.params.id] || [];
  } else {
    return {};
  }
};

const mapDispatchToProps = dispatch => {
  return {
    subscribeDeployEvents: jid => dispatch(subscribeDeployEventsAction(jid))
  };
};

const makegGetNodeDeploymentFromUrl = createSelector(
  getNodeDeploymentFromUrl,
  events => events
);

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(NodeDeployment)
  )
);
