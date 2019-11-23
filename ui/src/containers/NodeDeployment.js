import React from 'react';
import { useSelector } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import ReactJson from 'react-json-view';
import { Button, Loader, Steppers } from '@scality/core-ui';
import { useRouteMatch, useHistory } from 'react-router';

import {
  fontWeight,
  grayLighter,
  padding,
  fontSize,
} from '@scality/core-ui/dist/style/theme';

const NodeDeploymentContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: ${padding.larger};
  overflow: auto;
`;

const NodeDeploymentTitle = styled.div`
  color: ${props => props.theme.brand.text};
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.large};
  margin: ${padding.base};
`;

const NodeDeploymentEvent = styled.div`
  background-color: ${grayLighter};
  color: ${props => props.theme.brand.text} !important;
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

const NodeDeployment = ({ intl }) => {
  const history = useHistory();
  const match = useRouteMatch();
  const nodeName = match?.params?.id;

  const jobs = useSelector(state =>
    state.app.salt.jobs.filter(job => job.name === `deploy-node/${nodeName}`),
  );

  let activeJob = jobs.find(job => !job.completed);
  if (activeJob === undefined) {
    // Pick most recent one
    const sortedJobs = jobs.sort(
      (jobA, jobB) => Date(jobA.completedAt) >= Date(jobB.completedAt),
    );
    activeJob = sortedJobs[0];
  }

  let steps = [{ title: intl.messages.node_registered }];
  let success = false;
  if (activeJob) {
    if (activeJob.events.find(event => event.tag.includes('/new'))) {
      steps.push({ title: intl.messages.deployment_started });
    }

    if (activeJob.completed) {
      const status = activeJob.status;
      steps.push({
        title: intl.messages.completed,
        content: (
          <span>
            {!status.success && (
              <ErrorLabel>
                {`${intl.messages.error}: ${status.step} - ${status.comment}`}
              </ErrorLabel>
            )}
          </span>
        ),
      });
      success = status.success;
    } else {
      steps.push({
        title: intl.messages.deploying,
        content: <Loader size="larger" />,
      });
    }
  }

  // TODO: Remove this workaround and actually handle showing a failed step
  //       in the Steppers component
  const activeStep = success ? steps.length : steps.length - 1;

  return (
    <NodeDeploymentContainer>
      <div>
        <Button
          text={intl.messages.back_to_node_list}
          type="button"
          outlined
          onClick={() => history.push('/nodes')}
          icon={<i className="fas fa-arrow-left" />}
        />
      </div>
      <NodeDeploymentWrapper>
        <NodeDeploymentTitle>
          {intl.messages.node_deployment}
        </NodeDeploymentTitle>
          <NodeDeploymentContent>
            <NodeDeploymentStatus>
              <Steppers steps={steps} activeStep={activeStep} />
            </NodeDeploymentStatus>
            <NodeDeploymentEvent>
              <ReactJson
                src={activeJob.events}
                name={nodeName}
                collapsed={true}
              />
            </NodeDeploymentEvent>
          </NodeDeploymentContent>
      </NodeDeploymentWrapper>
    </NodeDeploymentContainer>
  );
};

export default injectIntl(NodeDeployment);
