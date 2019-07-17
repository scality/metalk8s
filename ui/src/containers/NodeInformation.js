import React from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import { createSelector } from 'reselect';
import { Table, Button } from '@scality/core-ui';
import styled from 'styled-components';

import { fetchPodsAction } from '../ducks/app/pods';
import { fetchNodesAction } from '../ducks/app/nodes';
import { sortSelector } from '../services/utils';
import {
  fontWeight,
  fontSize,
  padding
} from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';

const NodeInformationContainer = styled.div`
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: ${padding.larger};
`;

const PodsContainer = styled.div`
  flex-grow: 1;
`;

const PageTitle = styled.h2``;

const InformationTitle = styled.h3``;

const InformationSpan = styled.span`
  padding: 0 ${padding.larger} ${padding.small} ${padding.larger};
`;

const InformationLabel = styled.span`
  font-size: ${fontSize.small};
  padding: 0 ${padding.base};
  min-width: 120px;
  display: inline-block;
`;

const InformationValue = styled.span`
  font-size: ${fontSize.base};
`;

const InformationMainValue = styled(InformationValue)`
  font-weight: ${fontWeight.bold};
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
  }

  onSort({ sortBy, sortDirection }) {
    this.setState({ sortBy, sortDirection });
  }

  render() {
    const podsSortedList = sortSelector(
      this.props.pods,
      this.state.sortBy,
      this.state.sortDirection
    );

    return (
      <NodeInformationContainer>
        <div>
          <Button
            text={this.props.intl.messages.back_to_node_list}
            type="button"
            outlined
            onClick={() => this.props.history.push('/nodes')}
            icon={<i className="fas fa-arrow-left" />}
          />
        </div>
        <PageTitle>{this.props.intl.messages.information}</PageTitle>
        <InformationSpan>
          <InformationLabel>{this.props.intl.messages.name}</InformationLabel>
          <InformationMainValue>{this.props.node.name}</InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{this.props.intl.messages.status}</InformationLabel>
          <InformationValue>{this.props.node.status}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{this.props.intl.messages.roles}</InformationLabel>
          <InformationValue>{this.props.node.roles}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {this.props.intl.messages.version}
          </InformationLabel>
          <InformationValue>
            {this.props.node.metalk8s_version}
          </InformationValue>
        </InformationSpan>

        <InformationTitle>{this.props.intl.messages.pods}</InformationTitle>
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
      </NodeInformationContainer>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  node: makeGetNodeFromUrl(state, ownProps),
  pods: makeGetPodsFromUrl(state, ownProps)
});

const mapDispatchToProps = dispatch => {
  return {
    fetchPods: () => dispatch(fetchPodsAction()),
    fetchNodes: () => dispatch(fetchNodesAction())
  };
};

const getNodeFromUrl = (state, props) => {
  const nodes = state.app.nodes.list || [];
  if (props && props.match && props.match.params && props.match.params.id) {
    return nodes.find(node => node.name === props.match.params.id) || {};
  } else {
    return {};
  }
};

const getPodsFromUrl = (state, props) => {
  const pods = state.app.pods.list || [];
  if (props && props.match && props.match.params && props.match.params.id) {
    return pods.filter(pod => pod.nodeName === props.match.params.id) || [];
  } else {
    return [];
  }
};

const makeGetNodeFromUrl = createSelector(
  getNodeFromUrl,
  node => node
);

const makeGetPodsFromUrl = createSelector(
  getPodsFromUrl,
  pods => pods
);

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(NodeInformation)
);
