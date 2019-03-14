import React from 'react';
import { connect } from 'react-redux';
import { Table } from 'core-ui';
import memoizeOne from 'memoize-one';
import { fetchNodesAction } from '../ducks/nodes';
import { sortBy as sortByArray } from 'lodash';

const columns = [
  {
    label: 'Name',
    dataKey: 'name'
  },
  {
    label: 'Capacity CPU',
    dataKey: 'cpu'
  },
  {
    label: 'Memory',
    dataKey: 'memory'
  },
  {
    label: 'Number of pods',
    dataKey: 'pods'
  }
];

class NodeList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      nodes: [],
      sortBy: 'name',
      sortDirection: 'ASC'
    };
    this.onSort = this.onSort.bind(this);
  }

  componentDidMount() {
    this.props.fetchNodes(this.props.user.token);
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
        columns={columns}
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
    user: state.login.user,
    nodes: state.nodes.nodes
  };
}

const mapDispatchToProps = dispatch => {
  return {
    fetchNodes: token => dispatch(fetchNodesAction(token))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NodeList);
