import React from 'react';
import { connect } from 'react-redux';
import { Table } from 'core-ui';
import memoizeOne from 'memoize-one';
import { sortBy as sortByArray } from 'lodash';
import { injectIntl } from 'react-intl';
import { createSelector } from 'reselect';

import { fetchNodesAction } from '../ducks/app/nodes';

class NodeInformation extends React.Component {
  componentDidMount() {
    //this.props.fetchNodes();
  }
  render() {
    return <span>{this.props.node.name}</span>;
  }
}

const mapStateToProps = (state, ownProps) => ({
  node: makeGetNodeFromUrl(state, ownProps)
});

const mapDispatchToProps = dispatch => {
  return {
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

const makeGetNodeFromUrl = createSelector(
  getNodeFromUrl,
  node => node
);

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(NodeInformation)
);
