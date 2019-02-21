import React, { Component } from "react";
import { Route, Switch, Link } from "react-router-dom";
import "./App.css";
import { Layout } from "scality-ui";
import HomePage from "./HomePage";
import CallbackPage from "./NodeList";

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
      name: "Charles NGUYEN",
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
      user
    };

    return (
      <Layout sidebar={sidebar} navbar={navbar}>
        <Switch>
          <Route exact path="/" component={HomePage} />
          <Route exact path="/callback" component={CallbackPage} />
        </Switch>
      </Layout>
    );
  }
}

export default App;
