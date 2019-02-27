import React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Config, Core_v1Api, watch } from "@kubernetes/client-node";

class NodeList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      nodes: null
    };
    this.getNodes = this.getNodes.bind(this);
  }

  componentDidMount() {
    this.getNodes();
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
        this.setState({ nodes: nodesResponse.body.items });
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
      <div>
        <h2> Hello, {this.props.user.profile.name}!</h2>

        {this.state.nodes && (
          <React.Fragment>
            <h3>
              <Link to="/loading">Cluster nodes</Link>
            </h3>
            <ul>
              {this.state.nodes.map(node => (
                <li key={node.metadata.name}>{node.metadata.name}</li>
              ))}
            </ul>
          </React.Fragment>
        )}
      </div>
    );
  }
}
function mapStateToProps(state) {
  return {
    user: state.oidc.user
  };
}

export default connect(mapStateToProps)(NodeList);
