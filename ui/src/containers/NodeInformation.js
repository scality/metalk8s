import React from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import { createSelector } from 'reselect';
import styled from 'styled-components';
import { withRouter, Switch, Route } from 'react-router-dom';
import { Table, Button } from '@scality/core-ui';
import {
  fontWeight,
  fontSize,
  padding
} from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';

import { fetchPodsAction } from '../ducks/app/pods';
import { fetchNodesAction } from '../ducks/app/nodes';
import { fetchVolumesAction } from '../ducks/app/volumes';
import { sortSelector } from '../services/utils';

import NodeVolumes from './NodeVolumes';

const NodeInformationContainer = styled.div`
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: ${padding.larger};
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
  padding-right: ${padding.base}
  min-width: 150px;
  display: inline-block;
`;

const InformationValue = styled.span`
  font-size: ${fontSize.large};
`;

const InformationMainValue = styled(InformationValue)`
  font-weight: ${fontWeight.bold};
`;
const ButtonTabContainer = styled.div`
  margin-top: ${padding.small};
`;

const TabButton = styled(Button)`
  margin-right: ${padding.small};
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
  }

  onSort({ sortBy, sortDirection }) {
    this.setState({ sortBy, sortDirection });
  }

  render() {
    const { match, history, location, volumes, intl, node } = this.props;
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
      return {
        name: volume.metadata.name,
        status:
          (volume && volume.status && volume.status.phase) ||
          intl.messages.unknown,
        storageCapacity: volume.spec.sparseLoopDevice.size,
        storageClass: volume.spec.storageClassName,
        creationTime: volume.metadata.creationTimestamp
      };
    });

    const isVolumesPage = location.pathname.endsWith('/volumes');
    const isPodsPage = location.pathname.endsWith('/pods');

    return (
      <NodeInformationContainer>
        <div>
          <Button
            text={intl.messages.back_to_node_list}
            type="button"
            outlined
            onClick={() => history.push('/nodes')}
            icon={<i className="fas fa-arrow-left" />}
          />
        </div>

        {/**
         * FIXME This is a temporary solution.
         * We will replace this with a real tab soon
         */}
        <ButtonTabContainer>
          <TabButton
            text="Details"
            type="button"
            outlined={!isVolumesPage && !isPodsPage}
            onClick={() => history.push(match.url)}
          />
          <TabButton
            text="Volumes"
            type="button"
            outlined={isVolumesPage}
            onClick={() => history.push(`${match.url}/volumes`)}
          />
          <TabButton
            text="Pods"
            type="button"
            outlined={isPodsPage}
            onClick={() => history.push(`${match.url}/pods`)}
          />
        </ButtonTabContainer>

        <Switch>
          <Route path={`${match.url}/pods`} component={NodePods} />
          <Route
            path={`${match.url}/volumes`}
            component={() => <NodeVolumes data={volumeData} />}
          />
          <Route path="/" component={NodeDetails} />
        </Switch>
      </NodeInformationContainer>
    );
  }
}

const getNodeNameFromUrl = (state, props) => {
  if (props && props.match && props.match.params && props.match.params.id) {
    return props.match.params.id;
  } else {
    return '';
  }
};

const getNodes = state =>
  (state && state.app && state.app.nodes && state.app.nodes.list) || [];

const getPods = state =>
  (state && state.app && state.app.pods && state.app.pods.list) || [];

const getVolumes = state =>
  (state && state.app && state.app.volumes && state.app.volumes.list) || [];

const makeGetNodeFromUrl = createSelector(
  getNodeNameFromUrl,
  getNodes,
  (nodeName, nodes) => nodes.find(node => node.name === nodeName) || {}
);

const makeGetPodsFromUrl = createSelector(
  getNodeNameFromUrl,
  getPods,
  (nodeName, pods) => pods.filter(pod => pod.nodeName === nodeName) || []
);

const makeGetVolumesFromUrl = createSelector(
  getNodeNameFromUrl,
  getVolumes,
  (nodeName, volumes) =>
    volumes.filter(
      volume => volume && volume.spec && volume.spec.nodeName === nodeName
    )
);

const mapStateToProps = (state, ownProps) => ({
  node: makeGetNodeFromUrl(state, ownProps),
  pods: makeGetPodsFromUrl(state, ownProps),
  volumes: makeGetVolumesFromUrl(state, ownProps)
});

const mapDispatchToProps = dispatch => {
  return {
    fetchPods: () => dispatch(fetchPodsAction()),
    fetchNodes: () => dispatch(fetchNodesAction()),
    fetchVolumes: () => dispatch(fetchVolumesAction())
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
