import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import {
  padding,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import ActiveAlertsCounter from './ActiveAlertsCounter';
import { Steppers, Loader } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import isEmpty from 'lodash.isempty';
import {
  deployNodeAction,
  fetchClusterVersionAction,
} from '../ducks/app/nodes';
import {
  NodeTab,
  OverviewInformationLabel,
  OverviewInformationSpan,
  OverviewInformationValue,
  OverviewResourceName,
  ActiveAlertTitle,
  ActiveAlertWrapper,
} from './style/CommonLayoutStyle';
import CircleStatus from './CircleStatus';
import { API_STATUS_UNKNOWN } from '../constants';
import { useIntl } from 'react-intl';
const TabContentContainer = styled.div`
  overflow-y: auto;
  // 100vh subtract the height of navbar and tab header
  height: calc(100vh - 40px - 2.8rem);
`;
const NodeNameContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${padding.large} 0 ${padding.larger} ${padding.large};
`;
const StatusText = styled.span`
  color: ${(props) => {
    // @ts-expect-error - FIXME when you are working on it
    return props.textColor;
  }};
`;
const Detail = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
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
  const { nodeTableData, nodes, volumes, pods, nodeName } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  //Node deployment rely on the cluster version hence we need to ensure to have fetch it here
  useEffect(() => {
    dispatch(fetchClusterVersionAction());
  }, [dispatch]);
  const jobs = useSelector((state) =>
    // @ts-expect-error - FIXME when you are working on it
    state.app.salt.jobs.filter(
      (job) => job.type === 'deploy-node' && job.node === nodeName,
    ),
  );
  let activeJob = jobs.find((job) => !job.completed);

  if (activeJob === undefined) {
    // Pick most recent one
    const sortedJobs = jobs.sort(
      // @ts-expect-error - FIXME when you are working on it
      (jobA, jobB) => Date(jobA.completedAt) >= Date(jobB.completedAt),
    );
    activeJob = sortedJobs[0];
  }

  let steps = [
    {
      title: intl.formatMessage({
        id: 'node_registered',
      }),
    },
  ];
  let success = false;

  if (activeJob) {
    if (activeJob.events.find((event) => event.tag.includes('/new'))) {
      steps.push({
        title: intl.formatMessage({
          id: 'deployment_started',
        }),
      });
    }

    if (activeJob.completed) {
      const status = activeJob.status;
      steps.push({
        title: intl.formatMessage({
          id: 'completed',
        }),
        // @ts-expect-error - FIXME when you are working on it
        content: (
          <span>
            {!status.success && (
              <ErrorLabel>
                {`${intl.formatMessage({
                  id: 'error',
                })}: ${status.step} - ${status.comment}`}
              </ErrorLabel>
            )}
          </span>
        ),
      });
      success = status.success;
    } else {
      steps.push({
        title: intl.formatMessage({
          id: 'deploying',
        }),
        // @ts-expect-error - FIXME when you are working on it
        content: <Loader size="larger" />,
      });
    }
  }

  // TODO: Remove this workaround and actually handle showing a failed step
  //       in the Steppers component
  const activeStep = success ? steps.length : steps.length - 1;
  // The node object used by Node List Table
  const currentNode = nodeTableData?.find(
    (node) => node.name.name === nodeName,
  );
  const currentNodeReturnByK8S = nodes?.find((node) => node.name === nodeName);
  const creationTimestamp = currentNodeReturnByK8S
    ? new Date(currentNodeReturnByK8S.creationTimestamp)
    : '';
  const volumesAttachedCurrentNode = volumes?.filter(
    (volume) => volume.spec.nodeName === nodeName,
  );
  const podsScheduledOnCurrentNode = pods?.filter(
    (pod) => pod.nodeName === nodeName,
  );
  return (
    <NodeTab>
      <TabContentContainer>
        <NodeNameContainer>
          <div>
            <CircleStatus status={currentNode?.health?.health}></CircleStatus>
            <OverviewResourceName>{nodeName}</OverviewResourceName>
          </div>
          {currentNodeReturnByK8S?.status === API_STATUS_UNKNOWN &&
          !currentNodeReturnByK8S.internalIP ? (
            !currentNodeReturnByK8S?.deploying ? (
              <DeployButton
                label={intl.formatMessage({
                  id: 'deploy',
                })}
                variant="secondary"
                onClick={() => {
                  dispatch(
                    deployNodeAction({
                      name: nodeName,
                    }),
                  );
                }}
              />
            ) : (
              <DeployButton
                label={intl.formatMessage({
                  id: 'deploying',
                })}
                disabled
                variant="primary"
                icon={<Loader size="smaller" />}
              />
            )
          ) : null}
        </NodeNameContainer>

        <Detail>
          <div>
            <OverviewInformationSpan>
              <OverviewInformationLabel>
                Control Plane IP
              </OverviewInformationLabel>
              <OverviewInformationValue>
                {currentNode?.name?.controlPlaneIP}
              </OverviewInformationValue>
            </OverviewInformationSpan>
            <OverviewInformationSpan>
              <OverviewInformationLabel>
                Workload Plane IP
              </OverviewInformationLabel>
              <OverviewInformationValue>
                {currentNode?.name?.workloadPlaneIP}
              </OverviewInformationValue>
            </OverviewInformationSpan>
            <OverviewInformationSpan>
              <OverviewInformationLabel>Roles</OverviewInformationLabel>
              <OverviewInformationValue>
                {currentNode?.roles}
              </OverviewInformationValue>
            </OverviewInformationSpan>
            <OverviewInformationSpan>
              <OverviewInformationLabel>Status</OverviewInformationLabel>
              <OverviewInformationValue>
                {currentNode?.status?.computedStatus?.map((cond) => {
                  return (
                    <StatusText
                      key={cond}
                      // @ts-expect-error - FIXME when you are working on it
                      textColor={currentNode?.status?.statusColor}
                    >
                      {intl.formatMessage({
                        id: `${cond}`,
                      })}
                    </StatusText>
                  );
                })}
              </OverviewInformationValue>
            </OverviewInformationSpan>
            <OverviewInformationSpan>
              <OverviewInformationLabel>
                {intl.formatMessage({
                  id: 'creationTime',
                })}
              </OverviewInformationLabel>
              {creationTimestamp ? (
                <OverviewInformationValue>
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
                </OverviewInformationValue>
              ) : (
                ''
              )}
            </OverviewInformationSpan>
            <OverviewInformationSpan>
              <OverviewInformationLabel>K8s Version</OverviewInformationLabel>
              <OverviewInformationValue>
                {currentNodeReturnByK8S?.kubeletVersion}
              </OverviewInformationValue>
            </OverviewInformationSpan>
            <OverviewInformationSpan>
              <OverviewInformationLabel>Volumes</OverviewInformationLabel>
              <OverviewInformationValue>
                {volumesAttachedCurrentNode?.length ??
                  intl.formatMessage({
                    id: 'unknown',
                  })}
              </OverviewInformationValue>
            </OverviewInformationSpan>
            <OverviewInformationSpan>
              <OverviewInformationLabel>Pods</OverviewInformationLabel>
              <OverviewInformationValue>
                {podsScheduledOnCurrentNode?.length ??
                  intl.formatMessage({
                    id: 'unknown',
                  })}
              </OverviewInformationValue>
            </OverviewInformationSpan>
          </div>
          <ActiveAlertWrapper>
            <ActiveAlertTitle>
              {intl.formatMessage({
                id: 'active_alerts',
              })}
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
              {intl.formatMessage({
                id: 'deployment',
              })}
            </NodeDeploymentTitle>
            {activeJob === undefined ? (
              <InfoMessage>
                {intl.formatMessage(
                  {
                    id: 'no_deployment_found',
                  },
                  {
                    name: nodeName,
                  },
                )}
              </InfoMessage>
            ) : activeJob.completed && isEmpty(activeJob.status) ? (
              <InfoMessage>
                {intl.formatMessage({
                  id: 'refreshing_job',
                })}
              </InfoMessage>
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
