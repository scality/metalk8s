import React from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { withRouter, Switch, Route, Link } from 'react-router-dom';
import { Table, Breadcrumb, Tabs } from '@scality/core-ui';
import {
  fontWeight,
  fontSize,
  padding
} from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';

import { fetchPodsAction } from '../ducks/app/pods';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  fetchVolumesAction,
  fetchPersistentVolumeAction
} from '../ducks/app/volumes';
import {
  sortSelector,
  makeGetNodeFromUrl,
  makeGetPodsFromUrl,
  makeGetVolumesFromUrl
} from '../services/utils';

import NodeVolumes from './NodeVolumes';

const NodeInformationContainer = styled.div`
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

const PodsContainer = styled.div`
  flex-grow: 1;
  margin-top: ${padding.base};
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

const BreadcrumbContainer = styled.div`
  margin-left: ${padding.small};
  .sc-breadcrumb {
    padding: ${padding.smaller};
  }
`;

const BreadcrumbLabel = styled.span`
  font-size: ${fontSize.large};
`;

const StyledLink = styled(Link)`
  font-size: ${fontSize.large};
`;

class NodeInformation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pods: [],
      sortBy: 'name',
      sortDirection: 'ASC',
      columns: [
        {
          label: props.intl.messages.name,
          dataKey: 'name',
          flexGrow: 1
        },
        {
          label: props.intl.messages.status,
          dataKey: 'status'
        },
        {
          label: props.intl.messages.namespace,
          dataKey: 'namespace'
        },
        {
          label: props.intl.messages.start_time,
          dataKey: 'startTime',
          renderer: data => (
            <span>
              <FormattedDate value={data} /> <FormattedTime value={data} />
            </span>
          )
        },
        {
          label: props.intl.messages.restart,
          dataKey: 'restartCount'
        }
      ]
    };
    this.onSort = this.onSort.bind(this);
  }

  componentDidMount() {
    this.props.fetchNodes();
    this.props.fetchPods();
    this.props.fetchVolumes();
    this.props.fetchPersistentVolumes();
  }

  onSort({ sortBy, sortDirection }) {
    this.setState({ sortBy, sortDirection });
  }

  render() {
    const {
      match,
      history,
      location,
      volumes,
      intl,
      node,
      pVList,
      theme
    } = this.props;
    const podsSortedList = sortSelector(
      this.props.pods,
      this.state.sortBy,
      this.state.sortDirection
    );

    const NodeDetails = () => (
      <DetailsContainer>
        <InformationSpan>
          <InformationLabel>{intl.messages.name}</InformationLabel>
          <InformationMainValue>{node.name}</InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationValue>
            {intl.messages[node.status] || node.status}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.roles}</InformationLabel>
          <InformationValue>{node.roles}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.version}</InformationLabel>
          <InformationValue>{node.metalk8s_version}</InformationValue>
        </InformationSpan>
      </DetailsContainer>
    );

    const NodePods = () => (
      <>
        <PodsContainer>
          <Table
            list={podsSortedList}
            columns={this.state.columns}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={this.state.sortBy}
            sortDirection={this.state.sortDirection}
            onSort={this.onSort}
            onRowClick={() => {}}
            noRowsRenderer={() => (
              <NoRowsRenderer
                content={this.props.intl.messages.no_data_available}
              />
            )}
          />
        </PodsContainer>
      </>
    );

    const volumeData = volumes.map(volume => {
      const volumePV = pVList.find(
        pV => pV.metadata.name === volume.metadata.name
      );

      return {
        name: volume.metadata.name,
        status:
          (volume && volume.status && volume.status.phase) ||
          intl.messages.unknown,
        storageCapacity:
          (volumePV &&
            volumePV.spec &&
            volumePV.spec.capacity &&
            volumePV.spec.capacity.storage) ||
          intl.messages.unknown,
        storageClass: volume.spec.storageClassName,
        creationTime: volume.metadata.creationTimestamp
      };
    });

    const isVolumesPage = location.pathname.endsWith('/volumes');
    const isPodsPage = location.pathname.endsWith('/pods');

    return (
      <NodeInformationContainer>
        <BreadcrumbContainer>
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
              <BreadcrumbLabel>{node.name}</BreadcrumbLabel>
            ]}
          />
        </BreadcrumbContainer>
        <Tabs
          activeColor={theme.brand.secondary}
          items={[
            {
              selected: !isVolumesPage && !isPodsPage,
              title: intl.messages.details,
              onClick: () => history.push(match.url)
            },
            {
              selected: isVolumesPage,
              title: intl.messages.volumes,
              onClick: () => history.push(`${match.url}/volumes`)
            },
            {
              selected: isPodsPage,
              title: intl.messages.pods,
              onClick: () => history.push(`${match.url}/pods`)
            }
          ]}
        >
          <Switch>
            <Route path={`${match.url}/pods`} component={NodePods} />
            <Route
              path={`${match.url}/volumes`}
              component={() => (
                <NodeVolumes nodeName={match.params.id} data={volumeData} />
              )}
            />
            <Route path="/" component={NodeDetails} />
          </Switch>
        </Tabs>
      </NodeInformationContainer>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  theme: state.config.theme,
  node: makeGetNodeFromUrl(state, ownProps),
  pods: makeGetPodsFromUrl(state, ownProps),
  volumes: makeGetVolumesFromUrl(state, ownProps),
  pVList: state.app.volumes.pVList
});

const mapDispatchToProps = dispatch => {
  return {
    fetchPods: () => dispatch(fetchPodsAction()),
    fetchNodes: () => dispatch(fetchNodesAction()),
    fetchVolumes: () => dispatch(fetchVolumesAction()),
    fetchPersistentVolumes: () => dispatch(fetchPersistentVolumeAction())
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(NodeInformation)
  )
);
