import React from 'react';
import { FormattedDate, FormattedTime } from 'react-intl';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  padding,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import { TabContainer } from './CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

const InformationSpan = styled.div`
  padding-bottom: ${padding.base};
  padding-left: ${padding.large};
  display: flex;
`;

const InformationLabel = styled.span`
  display: inline-block;
  min-width: 150px;
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.base};
  color: ${(props) => props.theme.brand.textSecondary};
`;

const InformationValue = styled.span`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
`;

const NodeNameContainer = styled.div`
  display: flex;
  align-items: center;
  padding: ${padding.base} 0 ${padding.larger} ${padding.base};
`;

const NodeName = styled.div`
  font-size: ${fontSize.larger};
  padding-left: ${padding.small};
`;

const NodeStatusCircle = styled.div`
  color: ${(props) => {
    return props.color;
  }};
`;

const StatusText = styled.span`
  color: ${(props) => {
    return props.textColor;
  }};
`;

const NodePageOverviewTab = (props) => {
  const { nodeTableData, nodes, volumes, pods } = props;
  // Retrieve the node name from URL parameter
  const { name } = useParams();
  // The node object used by Node List Table
  const currentNode = nodeTableData?.find((node) => node.name.name === name);
  const currentNodeReturnByK8S = nodes?.find((node) => node.name === name);

  const creationTimestamp = currentNodeReturnByK8S
    ? new Date(currentNodeReturnByK8S.creationTimestamp)
    : '';

  const volumesAttachedCurrentNode = volumes.filter(
    (volume) => volume.spec.nodeName === name,
  );

  const podsScheduledOnCurrentNode = pods.filter(
    (pod) => pod.nodeName === name,
  );

  const statusColor = currentNode?.status?.statusColor;

  return (
    <TabContainer>
      <NodeNameContainer>
        <NodeStatusCircle color={statusColor}>
          <i className="fas fa-circle fa-2x"></i>
        </NodeStatusCircle>
        <NodeName>{name}</NodeName>
      </NodeNameContainer>
      <InformationSpan>
        <InformationLabel>Control Plane IP</InformationLabel>
        <InformationValue>{currentNode?.name?.controlPlaneIP}</InformationValue>
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
        <InformationLabel>{intl.translate('creationTime')}</InformationLabel>
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
          {volumesAttachedCurrentNode?.length ?? intl.translate('unknown')}
        </InformationValue>
      </InformationSpan>
      <InformationSpan>
        <InformationLabel>Pods</InformationLabel>
        <InformationValue>
          {podsScheduledOnCurrentNode?.length ?? intl.translate('unknown')}
        </InformationValue>
      </InformationSpan>
    </TabContainer>
  );
};

export default NodePageOverviewTab;
