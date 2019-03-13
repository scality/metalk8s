import React from 'react';
import { connect } from 'react-redux';
import { Table } from 'core-ui';
import { fetchNodesAction } from '../ducks/nodes';

const columns = [
  {
    label: 'Name',
    dataKey: 'name',
    disableSort: false
  },
  {
    label: 'Capacity CPU',
    dataKey: 'cpu',
    disableSort: false
  },
  {
    label: 'Memory',
    dataKey: 'memory',
    disableSort: false
  },
  {
    label: 'Number of pods',
    dataKey: 'pods',
    disableSort: true
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
    const sortedList = this.props.nodes.sort(function(a, b) {
      var nameA = a[sortBy].toString().toUpperCase(); // ignore upper and lowercase
      var nameB = b[sortBy].toString().toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }

    this.setState({ nodes: sortedList, sortBy, sortDirection });
  }

  render() {
    return (
      <Table
        list={this.props.nodes}
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
