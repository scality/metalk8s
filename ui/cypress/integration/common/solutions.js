import { When, Then, And } from 'cypress-cucumber-preprocessor/steps';

const environmentName = `environment-${new Date().getTime()}`;
const environmentDescription = `Test environment ${environmentName}`;
const solutionName = 'example-solution';
const solutionVersion = '0.1.0-dev';

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
    cy.get('input[name=name]').type(environmentName);
    cy.get('textarea[name=description]').type(environmentDescription);
    cy.get('[data-cy="submit_create_environment"]').click();
    cy.get('.sc-table-column-cell-name').should('contain', environmentName);
  },
);

When(
  'I click on the Add Solution button to add a solution to the environment',
  () => {
    //Check if the solution have been imported
    cy.get('.sc-table:last .sc-table-row')
      .should('have.length', 2)
      .eq(1)
      .find('.sc-table-column-cell-name')
      .should('contain', 'example-solution'); //contains example-solution

    cy.get(`[data-cy="add_solution_to_${environmentName}_button"]`).click();
    cy.get('.sc-modal').should('have.length', 1);
  },
);

Then(
  'I fill out the Add Solution form in the modal and I check if the solution is added the environment',
  () => {
    cy.get('.sc-modal .sc-select')
      .eq(0)
      .click();
    cy.get('.sc-modal .sc-select__menu')
      .find(`[data-cy="${solutionName}"]`)
      .click();
    cy.get('.sc-modal .sc-select')
      .eq(1)
      .click();
    cy.get('.sc-modal .sc-select__menu')
      .find(`[data-cy="${solutionVersion}"]`)
      .click();

    cy.get('.sc-modal  [data-cy="add_solution_submit_button"]').click();

    cy.get('@windowOpen').should(
      'be.calledWithMatch', //TO BE UPDATED to test the exact url when the Solution UI ingress in available
      `/environments/${environmentName}/version/${solutionVersion}/prepare`,
    );
  },
);
