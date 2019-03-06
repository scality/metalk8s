import React from "react";
import { connect } from "react-redux";
import { Config, Core_v1Api, watch } from "@kubernetes/client-node";
import { Table } from "core-ui";

const columns = [
  {
    label: "Name",
    dataKey: "name",
    disableSort: false
  },
  {
    label: "Capacity CPU",
    dataKey: "cpu",
    disableSort: false
  },
  {
    label: "Memory",
    dataKey: "memory",
    disableSort: false
  },
  {
    label: "Number of pods",
    dataKey: "pods",
    disableSort: true
  }
];

class NodeList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      nodes: [],
      sortBy: "name",
      sortDirection: "ASC"
    };
    this.getNodes = this.getNodes.bind(this);
    this.onSort = this.onSort.bind(this);
  }

  componentDidMount() {
    this.getNodes();
  }

  onSort({ sortBy, sortDirection }) {
    const sortedList = this.state.nodes.sort(function(a, b) {
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

    if (sortDirection === "DESC") {
      sortedList.reverse();
    }

    this.setState({ nodes: sortedList, sortBy, sortDirection });
  }
  getNodes() {
    const config = new Config(
      process.env.REACT_APP_API_SERVER,
      this.props.user.id_token,
      this.props.user.token_type
    );
    const coreV1 = config.makeApiClient(Core_v1Api);

    watch(
      config,
      "/api/v1/watch/events",
      {},
      function(type, object) {
        console.log("New event", type, object);
      },
      function(e) {
        console.log("Stream ended", e);
      }
    );

    coreV1
      .listNode()
      .then(nodesResponse => {
        const items = nodesResponse.body.items.map(node => ({
          name: node.metadata.name,
          cpu: node.status.capacity.cpu,
          memory: node.status.capacity.memory,
          pods: node.status.capacity.pods
        }));
        this.setState({ nodes: items });
      })
      .catch(error => {
        console.error(
          "Error retrieving nodes",
          error.body ? error.body : error
        );
      });
  }
  render() {
    return (
      <Table
        list={this.state.nodes}
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
    user: state.oidc.user
  };
}

export default connect(mapStateToProps)(NodeList);
