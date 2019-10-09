import { When, Then, And } from 'cypress-cucumber-preprocessor/steps';

When(
  'I go to the solutions list by click the solution icon in the sidebar',
  () => {
    cy.server();
    cy.route(
      'GET',
      'api/kubernetes/apis/solutions.metalk8s.scality.com/v1alpha1/environments',
    ).as('getEnvironments');

    cy.get('.sc-sidebar-item')
      .eq(2)
      .click(); // go to solutions list

    const timeOut = {
      requestTimeout: 30000,
      responseTimeout: 30000,
    };
    cy.wait('@getEnvironments', timeOut);

    cy.get('.sc-table:first .sc-table-row').should('have.length', 1); //Only Table header
  },
);

And(
  'I go to the Create Envrionments page by clicking the Create a New Environment button',
  () => {
    cy.get('[data-cy="create_new_environment_button"]').click();
  },
);

Then(
  'I fill out the Create Envrionments form and ckeck if the environment I created is displayed on the envrionments list',
  () => {
    const environmentName = `environment-${new Date().getTime()}`;
    const environmentDescription = `Test environment ${environmentName}`;

    cy.get('input[name=name]').type(environmentName);
    cy.get('textarea[name=description]').type(environmentDescription);

    cy.get('[data-cy="submit_create_environment"]').click();

    cy.get('.sc-table-column-cell-name').should('contain', environmentName);
  },
);
