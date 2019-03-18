import React from 'react';
import { connect } from 'react-redux';
import { Table } from 'core-ui';
import memoizeOne from 'memoize-one';
import { sortBy as sortByArray } from 'lodash';
import { injectIntl } from 'react-intl';

import { fetchNodesAction } from '../ducks/nodes';

class NodeList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      nodes: [],
      sortBy: 'name',
      sortDirection: 'ASC',
      columns: [
        {
          label: props.intl.messages.name,
          dataKey: 'name'
        },
        {
          label: props.intl.messages.cpu_capacity,
          dataKey: 'cpu'
        },
        {
          label: props.intl.messages.memory,
          dataKey: 'memory'
        },
        {
          label: props.intl.messages.pods_number,
          dataKey: 'pods'
        }
      ]
    };
    this.onSort = this.onSort.bind(this);
  }

  componentDidMount() {
    this.props.fetchNodes();
  }

  onSort({ sortBy, sortDirection }) {
    this.setState({ sortBy, sortDirection });
  }

  sortNodes(nodes, sortBy, sortDirection) {
    return memoizeOne((nodes, sortBy, sortDirection) => {
      const sortedList = sortByArray(nodes, [
        node => {
          return typeof node[sortBy] === 'string'
            ? node[sortBy].toLowerCase()
            : node[sortBy];
        }
      ]);

      if (sortDirection === 'DESC') {
        sortedList.reverse();
      }
      return sortedList;
    })(nodes, sortBy, sortDirection);
  }
  render() {
    const nodesSortedList = this.sortNodes(
      this.props.nodes,
      this.state.sortBy,
      this.state.sortDirection
    );

    return (
      <Table
        list={nodesSortedList}
        columns={this.state.columns}
        disableHeader={false}
        headerHeight={40}
        rowHeight={40}
        sortBy={this.state.sortBy}
        sortDirection={this.state.sortDirection}
        onSort={this.onSort}
        onRowClick={() => {}}
      />
    );
  }
}
function mapStateToProps(state) {
  return {
    nodes: state.nodes.nodes
  };
}

const mapDispatchToProps = dispatch => {
  return {
    fetchNodes: () => dispatch(fetchNodesAction())
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(NodeList)
);
