import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedDate, FormattedTime } from 'react-intl';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  padding,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import ActiveAlertsCounter from './ActiveAlertsCounter';
import { Button, Steppers, Loader } from '@scality/core-ui';
import isEmpty from 'lodash.isempty';
import { deployNodeAction } from '../ducks/app/nodes';
import { NodeTab } from './style/CommonLayoutStyle';
import CircleStatus from './CircleStatus';
import { API_STATUS_UNKNOWN } from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

const TabContentContainer = styled.div`
  overflow-y: auto;
  // 100vh subtract the height of navbar and tab header
  height: calc(100vh - 40px - 2.8rem);
`;

const InformationSpan = styled.div`
  padding: 0 0 ${padding.large} ${padding.large};
`;

const InformationLabel = styled.span`
  display: inline-block;
  min-width: 150px;
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.base};
  color: ${(props) => props.theme.textSecondary};
`;

const InformationValue = styled.span`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
`;

const NodeNameContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${padding.large} 0 ${padding.larger} ${padding.large};
`;

const NodeName = styled.span`
  font-size: ${fontSize.larger};
  padding-left: ${padding.smaller};
`;

const StatusText = styled.span`
  color: ${(props) => {
    return props.textColor;
  }};
`;

const Detail = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const ActiveAlertTitle = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: 0 0 ${padding.base} 0;
`;

const ActiveAlertWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 ${padding.larger} 0 ${padding.base};
  width: 200px;
`;

const DeployButton = styled(Button)`
  margin-right: ${padding.base};
`;

const NodeDeploymentWrapper = styled.div`
  padding: ${padding.smaller} 0 0 ${padding.small};
  margin: ${padding.base} ${padding.base} 0 ${padding.base};
  background-color: ${(props) => props.theme.backgroundLevel3};
`;

const NodeDeploymentTitle = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.base};
`;

const NodeDeploymentStatus = styled.div`
  padding: ${padding.base};
  font-size: ${fontSize.base};
`;

const InfoMessage = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  padding: ${padding.base};
`;

const NodeDeploymentContent = styled.div`
  display: flex;
`;

const ErrorLabel = styled.span`
  color: ${(props) => props.theme.statusCritical};
`;

const NodePageOverviewTab = (props) => {
  const { nodeTableData, nodes, volumes, pods } = props;

  // Retrieve the node name from URL parameter
  const { name } = useParams();
  const dispatch = useDispatch();

  const jobs = useSelector((state) =>
    state.app.salt.jobs.filter(
      (job) => job.type === 'deploy-node' && job.node === name,
    ),
  );

  let activeJob = jobs.find((job) => !job.completed);
  if (activeJob === undefined) {
    // Pick most recent one
    const sortedJobs = jobs.sort(
      (jobA, jobB) => Date(jobA.completedAt) >= Date(jobB.completedAt),
    );
    activeJob = sortedJobs[0];
  }

  let steps = [{ title: intl.translate('node_registered') }];
  let success = false;
  if (activeJob) {
    if (activeJob.events.find((event) => event.tag.includes('/new'))) {
      steps.push({ title: intl.translate('deployment_started') });
    }

    if (activeJob.completed) {
      const status = activeJob.status;
      steps.push({
        title: intl.translate('completed'),
        content: (
          <span>
            {!status.success && (
              <ErrorLabel>
                {`${intl.translate('error')}: ${status.step} - ${
                  status.comment
                }`}
              </ErrorLabel>
            )}
          </span>
        ),
      });
      success = status.success;
    } else {
      steps.push({
        title: intl.translate('deploying'),
        content: <Loader size="larger" />,
      });
    }
  }

  // TODO: Remove this workaround and actually handle showing a failed step
  //       in the Steppers component
  const activeStep = success ? steps.length : steps.length - 1;

  // The node object used by Node List Table
  const currentNode = nodeTableData?.find((node) => node.name.name === name);
  const currentNodeReturnByK8S = nodes?.find((node) => node.name === name);

  const creationTimestamp = currentNodeReturnByK8S
    ? new Date(currentNodeReturnByK8S.creationTimestamp)
    : '';

  const volumesAttachedCurrentNode = volumes?.filter(
    (volume) => volume.spec.nodeName === name,
  );

  const podsScheduledOnCurrentNode = pods?.filter(
    (pod) => pod.nodeName === name,
  );

  return (
    <NodeTab>
      <TabContentContainer>
        <NodeNameContainer>
          <div>
            <CircleStatus status={currentNode?.health?.health}></CircleStatus>
            <NodeName>{name}</NodeName>
          </div>
          {currentNodeReturnByK8S?.status === API_STATUS_UNKNOWN ? (
            !currentNodeReturnByK8S?.deploying ? (
              <DeployButton
                text={intl.translate('deploy')}
                variant="buttonSecondary"
                onClick={() => {
                  dispatch(deployNodeAction({ name }));
                }}
              />
            ) : (
              <DeployButton
                text={intl.translate('deploying')}
                disabled
                icon={<Loader size="smaller" />}
              />
            )
          ) : null}
        </NodeNameContainer>

        <Detail>
          <div>
            <InformationSpan>
              <InformationLabel>Control Plane IP</InformationLabel>
              <InformationValue>
                {currentNode?.name?.controlPlaneIP}
              </InformationValue>
            </InformationSpan>
            <InformationSpan>
              <InformationLabel>Workload Plane IP</InformationLabel>
              <InformationValue>
                {currentNode?.name?.workloadPlaneIP}
              </InformationValue>
            </InformationSpan>
            <InformationSpan>
              <InformationLabel>Roles</InformationLabel>
              <InformationValue>{currentNode?.roles}</InformationValue>
            </InformationSpan>
            <InformationSpan>
              <InformationLabel>Status</InformationLabel>
              <InformationValue>
                {currentNode?.status?.computedStatus?.map((cond) => {
                  return (
                    <StatusText
                      key={cond}
                      textColor={currentNode?.status?.statusColor}
                    >
                      {intl.translate(`${cond}`)}
                    </StatusText>
                  );
                })}
              </InformationValue>
            </InformationSpan>
            <InformationSpan>
              <InformationLabel>
                {intl.translate('creationTime')}
              </InformationLabel>
              {creationTimestamp ? (
                <InformationValue>
                  <FormattedDate
                    value={creationTimestamp}
                    year="numeric"
                    month="short"
                    day="2-digit"
                  />{' '}
                  <FormattedTime
                    hour="2-digit"
                    minute="2-digit"
                    second="2-digit"
                    value={creationTimestamp}
                  />
                </InformationValue>
              ) : (
                ''
              )}
            </InformationSpan>
            <InformationSpan>
              <InformationLabel>K8s Version</InformationLabel>
              <InformationValue>
                {currentNodeReturnByK8S?.kubeletVersion}
              </InformationValue>
            </InformationSpan>
            <InformationSpan>
              <InformationLabel>Volumes</InformationLabel>
              <InformationValue>
                {volumesAttachedCurrentNode?.length ??
                  intl.translate('unknown')}
              </InformationValue>
            </InformationSpan>
            <InformationSpan>
              <InformationLabel>Pods</InformationLabel>
              <InformationValue>
                {podsScheduledOnCurrentNode?.length ??
                  intl.translate('unknown')}
              </InformationValue>
            </InformationSpan>
          </div>
          <ActiveAlertWrapper>
            <ActiveAlertTitle>
              {intl.translate('active_alerts')}
            </ActiveAlertTitle>
            <ActiveAlertsCounter
              criticalCounter={currentNode?.health?.criticalAlertsCounter}
              warningCounter={currentNode?.health?.warningAlertsCounter}
            ></ActiveAlertsCounter>
          </ActiveAlertWrapper>
        </Detail>

        {currentNodeReturnByK8S?.status === API_STATUS_UNKNOWN ? (
          <NodeDeploymentWrapper>
            <NodeDeploymentTitle>
              {intl.translate('deployment')}
            </NodeDeploymentTitle>
            {activeJob === undefined ? (
              <InfoMessage>
                {intl.translate('no_deployment_found', { name: name })}
              </InfoMessage>
            ) : activeJob.completed && isEmpty(activeJob.status) ? (
              <InfoMessage>{intl.translate('refreshing_job')}</InfoMessage>
            ) : (
              <NodeDeploymentContent>
                <NodeDeploymentStatus>
                  <Steppers steps={steps} activeStep={activeStep} />
                </NodeDeploymentStatus>
              </NodeDeploymentContent>
            )}
          </NodeDeploymentWrapper>
        ) : null}
      </TabContentContainer>
    </NodeTab>
  );
};

export default NodePageOverviewTab;
