import React from 'react';
import { connect } from 'react-redux';
import { Table } from 'core-ui';
import memoizeOne from 'memoize-one';
import { sortBy as sortByArray } from 'lodash';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';

import { fetchNodesAction, deleteNodeAction } from '../ducks/app/nodes';

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
          label: props.intl.messages.status,
          dataKey: 'status'
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
          label: props.intl.messages.creationDate,
          dataKey: 'creationDate',
          renderer: data => (
            <span>
              <FormattedDate value={data} /> <FormattedTime value={data} />
            </span>
          )
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

  onRowClick(row) {
    if (row.rowData && row.rowData.name) {
      this.props.history.push(`/nodes/${row.rowData.name}`);
    }
  }

  sortNodes = memoizeOne((nodes, sortBy, sortDirection) => {
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
  });

  render() {
    const nodesSortedList = this.sortNodes(
      this.props.nodes,
      this.state.sortBy,
      this.state.sortDirection
    );

    const nodesWithActions = nodesSortedList.map(node => {
      return {
        ...node,
        actions:
          !node.status || node.status === 'Unknown'
            ? [
                {
                  label: this.props.intl.messages.remove,
                  onClick: this.props.deleteNode
                }
              ]
            : null
      };
    });

    return (
      <Table
        list={nodesWithActions}
        columns={this.state.columns}
        disableHeader={false}
        headerHeight={40}
        rowHeight={40}
        sortBy={this.state.sortBy}
        sortDirection={this.state.sortDirection}
        onSort={this.onSort}
        onRowClick={item => this.onRowClick(item)}
      />
    );
  }
}
function mapStateToProps(state) {
  return {
    nodes: state.app.nodes.list
  };
}

const mapDispatchToProps = dispatch => {
  return {
    fetchNodes: () => dispatch(fetchNodesAction()),
    deleteNode: node => dispatch(deleteNodeAction(node))
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(NodeList)
);
