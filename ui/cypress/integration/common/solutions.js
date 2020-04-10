import { When, Then, And } from 'cypress-cucumber-preprocessor/steps';

const environmentName = `environment-${new Date().getTime()}`;
const environmentDescription = `Test environment ${environmentName}`;
const solutionName = 'example-solution';
const solutionVersion = '0.1.0-dev';

When(
  'I go to the solutions list by clicking the solution icon in the sidebar',
  () => {
    cy.server();

    cy.route(
      'GET',
      '/api/kubernetes/api/v1/namespaces?labelSelector=solutions.metalk8s.scality.com/environment',
    ).as('getEnvironmentsList');

    cy.get('.sc-sidebar-item').eq(2).click(); // go to solutions list

    const timeOut = {
      requestTimeout: 60000,
      responseTimeout: 60000,
    };
    cy.wait('@getEnvironmentsList', timeOut);
    cy.get('.sc-table:first .sc-table-row').should('have.length', 1); //Only Table header
  },
);

And(
  'I go to the Create Environment page by clicking the Create a New Environment button',
  () => {
    cy.get('[data-cy="create_new_environment_button"]').click();
  },
);

Then(
  'I fill out the Create Environment form and check if the environment I created is displayed on the Environments list',
  () => {
    cy.get('input[name=name]').type(environmentName);
    cy.get('textarea[name=description]').type(environmentDescription);

    cy.get('[data-cy="submit-create-environment"]').click();

    cy.get('.sc-table-column-cell-name').should('contain', environmentName);
  },
);

When(
  'I click on the Add Solution button to add a solution to the environment',
  () => {
    cy.get(`[data-cy="add_solution_to_${environmentName}_button"]`).click();
    cy.get('.sc-modal').should('have.length', 1);
  },
);

Then(
  'I fill out the Add Solution form in the modal and I check if the solution is added the environment',
  () => {
    cy.route(
      'GET',
      `api/kubernetes/apis/apps/v1/namespaces/${environmentName}/deployments/example-solution-operator`,
    ).as('getSolutionOperatorDeployment');

    cy.get('.sc-modal .sc-select').eq(0).click();
    cy.get(`[data-cy="${solutionName}"]`).click();
    cy.get('.sc-modal .sc-select').eq(1).click();
    cy.get(`[data-cy="${solutionVersion}"]`).click();

    cy.get('[data-cy="add_solution_submit_button"]').click();
    // check if the solution name and version displayed in the Environment table
    const timeOut = {
      requestTimeout: 60000,
      responseTimeout: 60000,
    };
    // To make sure the prepare environment is ready, because something we maybe update the env during the preparation
    cy.wait('@getSolutionOperatorDeployment', timeOut);
    cy.wait('@getSolutionOperatorDeployment', timeOut);

    cy.get('.sc-table-column-cell-container-solutions').should(
      'contain',
      `${solutionName} (v.${solutionVersion}`,
    );
  },
);

Then(
  'I click on the delete button and check if the environment is deleted from the Environments list',
  () => {
    cy.route(
      'GET',
      '/api/kubernetes/api/v1/namespaces?labelSelector=solutions.metalk8s.scality.com/environment',
    ).as('getEnvironmentsList');
    cy.route(
      'DELETE',
      `api/kubernetes/api/v1/namespaces/${environmentName}`,
    ).as('deleteEnvironment');
    cy.route(
      'GET',
      `api/kubernetes/api/v1/namespaces/metalk8s-solutions/configmaps/metalk8s-solutions`,
    ).as('getEnvironmentConfigMap');
    cy.get(`[data-cy="delete_${environmentName}_button"]`).click();

    const timeOut = {
      requestTimeout: 60000,
      responseTimeout: 60000,
    };
    cy.wait('@deleteEnvironment', timeOut);
    cy.wait('@getEnvironmentsList', timeOut);
    cy.wait('@getEnvironmentConfigMap', timeOut); // wait until the next time updating the environment

    cy.get('.sc-table-column-cell-name').should('not.contain', environmentName); // check the environment I created is being deleted
  },
);
