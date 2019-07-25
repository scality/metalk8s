import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { createSelector } from 'reselect';
import styled from 'styled-components';
import ReactJson from 'react-json-view';
import { Button, Loader, Steppers } from '@scality/core-ui';
import { withRouter } from 'react-router-dom';

import { subscribeDeployEventsAction } from '../ducks/app/nodes';
import { getJobStatusFromEventRet } from '../../src/services/salt/utils';
import {
  fontWeight,
  grayLightest,
  padding,
  fontSize
} from '@scality/core-ui/dist/style/theme';

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
  margin: ${padding.base};
`;

const NodeDeploymentEvent = styled.div`
  background-color: ${grayLightest};
  padding: ${padding.base};
  margin: ${padding.base};
  border-radius: 5px;
  display: flex;
  flex-grow: 1;
`;

const NodeDeploymentContent = styled.div`
  display: flex;
`;

const NodeDeploymentWrapper = styled.div`
  padding: ${padding.base};
`;

const NodeDeploymentStatus = styled.div`
  padding: ${padding.larger};
  width: 400px;
`;

const ErrorLabel = styled.span`
  color: ${props => props.theme.brand.danger};
`;

function NodeDeployment(props) {
  const [activeStep, setActiveStep] = useState(1);
  const [steps, setSteps] = useState([
    { title: props.intl.messages.node_registered },
    { title: props.intl.messages.deploying, content: <Loader size="larger" /> }
  ]);

  const nodeId = props?.match?.params?.id;
  const { subscribeDeployEvents, events, intl } = props;

  useEffect(() => {
    if (nodeId) {
      subscribeDeployEvents(nodeId);
    }

    if (
      //To improve
      !steps.find(step => step.title === intl.messages.deployment_started) &&
      events.find(event => event.tag.includes('/new'))
    ) {
      const newSteps = steps;
      newSteps.splice(steps.length - 1, 0, {
        title: intl.messages.deployment_started
      });
      setSteps(newSteps);
      setActiveStep(2);
    }

    const result = events.find(event => event.tag.includes('/ret'));
    if (result) {
      const status = getJobStatusFromEventRet(result.data);
      const newSteps = steps;
      newSteps.splice(steps.length - 1, 1, {
        title: intl.messages.completed,
        content: (
          <span>
            {!status.success && (
              <ErrorLabel>
                {`${intl.messages.error}: ${status.step_id} - ${
                  status.comment
                }`}
              </ErrorLabel>
            )}
          </span>
        )
      });
      setSteps(newSteps);
      setActiveStep(status.success ? steps.length : steps.length - 1);
    }
  }, [
    events,
    intl.messages.completed,
    intl.messages.deployment_started,
    intl.messages.error,
    nodeId,
    steps,
    subscribeDeployEvents
  ]);

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
        <NodeDeploymentContent>
          <NodeDeploymentStatus>
            <Steppers steps={steps} activeStep={activeStep} />
          </NodeDeploymentStatus>
          <NodeDeploymentEvent>
            <ReactJson
              src={props.events}
              name={props.match.params.id}
              collapsed={true}
            />
          </NodeDeploymentEvent>
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
