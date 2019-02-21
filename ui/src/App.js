import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter, Route, Switch } from "react-router-dom";
import "./App.css";
import { Layout } from "scality-ui";
import HomePage from "./HomePage";
import CallbackPage from "./LoginCallback";
import { ThemeProvider } from "styled-components";

class App extends Component {
  render() {
    const sideBarActions = [
      {
        label: "Dashboard",
        icon: <i className="fas fa-tachometer-alt" />,

        active: true
      },
      {
        label: "Servers",
        icon: <i className="fas fa-server" />
      },
      {
        label: "Disks",
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
      actions: [{ label: "Log out" }]
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
            <Route exact path="/" component={HomePage} />
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
