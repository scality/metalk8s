import React from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import {
  padding,
  fontSize,
  fontWeight
} from '@scality/core-ui/dist/style/theme';
import { Breadcrumb } from '@scality/core-ui';
import { withRouter, Link } from 'react-router-dom';
import {
  makeGetNodeFromUrl,
  makeGetVolumesFromUrl,
  useRefreshNodes
} from '../services/utils';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';

const VolumeInformationContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding: ${padding.base};

  .sc-tabs {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    margin: ${padding.smaller} ${padding.small} 0 ${padding.smaller};
  }

  .sc-tabs-item {
    /* We will change this logic later */
    flex-basis: auto;
    width: 100px;
  }

  .sc-tabs-item-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: ${padding.smaller};
  }
`;

const BreadcrumbContainer = styled.div`
  margin-left: ${padding.small};
  .sc-breadcrumb {
    padding: ${padding.smaller};
  }
`;
const StyledLink = styled(Link)`
  font-size: ${fontSize.large};
`;
const BreadcrumbLabel = styled.span`
  font-size: ${fontSize.large};
`;
const DetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: ${padding.base};
`;
const InformationSpan = styled.span`
  padding: 0 ${padding.larger} ${padding.small} 0;
`;
const InformationLabel = styled.span`
  font-size: ${fontSize.large};
  padding-right: ${padding.base};
  min-width: 150px;
  display: inline-block;
`;
const InformationValue = styled.span`
  font-size: ${fontSize.large};
`;
const InformationMainValue = styled(InformationValue)`
  font-weight: ${fontWeight.bold};
`;

const VolumeInformation = props => {
  const { intl, theme, node, match, volumes } = props;

  useRefreshNodes();

  console.log('volumes', volumes);
  console.log('node', node);

  const volume = volumes.find(v => v.name === match.params.volumeName);
  console.log(volume);
  return (
    <VolumeInformationContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
            <StyledLink to={`/nodes/${node.name}/volumes`}>
              {node.name}
            </StyledLink>,
            <BreadcrumbLabel>{match.params.volumeName}</BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <DetailsContainer>
        <InformationSpan>
          <InformationLabel>{intl.messages.name}</InformationLabel>
          <InformationMainValue>{node.name}</InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.type}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'Bounded'}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.storageClass}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'Path'}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'AccessMode'}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'MountOption'}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.creationTime}</InformationLabel>
          <InformationMainValue />
        </InformationSpan>
      </DetailsContainer>
    </VolumeInformationContainer>
  );
};

const mapStateToProps = (state, ownProps) => ({
  theme: state.config.theme,
  node: makeGetNodeFromUrl(state, ownProps),
  volumes: makeGetVolumesFromUrl(state, ownProps),
  pVList: state.app.volumes.pVList
});

const mapDispatchToProps = dispatch => {
  return {
    refreshNodes: () => dispatch(refreshNodesAction()),
    stopRefreshNodes: () => dispatch(stopRefreshNodesAction())
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(VolumeInformation)
  )
);
