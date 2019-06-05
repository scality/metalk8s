import React from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import { createSelector } from 'reselect';
import { Table } from 'core-ui';
import memoizeOne from 'memoize-one';
import { sortBy as sortByArray } from 'lodash';
import styled from 'styled-components';

import { fetchPodsAction } from '../ducks/app/pods';
import { fetchNodesAction } from '../ducks/app/nodes';

import { fontWeight, fontSize, padding } from 'core-ui/dist/style/theme';

const NodeInformationContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: ${padding.larger};
`;

const PodsContainer = styled.div`
  flex-grow: 1;
  max-height: 400px;
`;

const PageTitle = styled.h2`
  margin-top: 0;
`;

const InformationTitle = styled.h3``;

const InformationSpan = styled.span`
  padding: 0 ${padding.larger} ${padding.small} ${padding.larger};
`;

const InformationLabel = styled.span`
  font-size: ${fontSize.small};
  padding: 0 ${padding.base};
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
          dataKey: 'name'
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

  sortPods = memoizeOne((pods, sortBy, sortDirection) => {
    const sortedList = sortByArray(pods, [
      pod => {
        return typeof pod[sortBy] === 'string'
          ? pod[sortBy].toLowerCase()
          : pod[sortBy];
      }
    ]);

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }
    return sortedList;
  });

  render() {
    const podsSortedList = this.sortPods(
      this.props.pods,
      this.state.sortBy,
      this.state.sortDirection
    );

    return (
      <NodeInformationContainer>
        <PageTitle>{this.props.intl.messages.information}</PageTitle>
        <InformationSpan>
          <InformationLabel>{this.props.intl.messages.name}</InformationLabel>
          <InformationMainValue>{this.props.node.name}</InformationMainValue>
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
