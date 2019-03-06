import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter, Route, Switch } from "react-router-dom";
import "./App.css";
import { Layout } from "core-ui";
import CallbackPage from "./LoginCallback";
import { ThemeProvider } from "styled-components";
import userManager from "./utils/userManager";
import PrivateRoute from "./PrivateRoute";
import NodeList from "./NodeList";

class App extends Component {
  logout(event) {
    event.preventDefault();
    userManager.removeUser(); // removes the user data from sessionStorage
  }
  render() {
    const sideBarActions = [
      {
        label: "Nodes",
        icon: <i className="fas fa-server" />,
        active: true
      },
      {
        label: "Pods",
        icon: <i className="fas fa-hdd" />
      }
    ];

    const applications = [
      {
        label: "Hyperdrive UI"
      }
    ];

    const help = [
      { label: "About" },
      {
        label: "Documentation"
      },
      { label: "Onboarding" }
    ];

    const user = {
      name:
        this.props.user &&
        this.props.user.profile &&
        this.props.user.profile.name + " " + this.props.user.profile.email,
      actions: [{ label: "Log out", onClick: this.logout }]
    };

    const sidebar = {
      expanded: true,
      actions: sideBarActions
    };

    const navbar = {
      onToggleClick: () => {},
      toggleVisible: true,
      productName: "Metalk8s Platform",
      applications,
      help,
      user: this.props.user ? user : null
    };

    const theme = {
      brand: {
        primary: "#006F62"
      }
    };

    return (
      <ThemeProvider theme={theme}>
        <Layout sidebar={sidebar} navbar={navbar}>
          <Switch>
            <PrivateRoute exact path="/" component={NodeList} />
            <Route exact path="/callback" component={CallbackPage} />
          </Switch>
        </Layout>
      </ThemeProvider>
    );
  }
}

function mapStateToProps(state) {
  return {
    user: state.oidc.user
  };
}

export default withRouter(connect(mapStateToProps)(App));
