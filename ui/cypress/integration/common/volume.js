import { And, Then, When } from 'cypress-cucumber-preprocessor/steps';

And(
  'I go to the bootstrap node by click on the bootstrap row in the list',
  () => {
    cy.get('.sc-table-row').eq(1).click();
  },
);

And('I choose the Volumes tag', () => {
  cy.get('.sc-tabs-bar .sc-tabs-item-title').eq(1).click();
});

And('I go to create volume page by click on Create a New Volume button', () => {
  cy.get('[data-cy="create-volume-button"]').click();
});

When('I go to the volume page by click the volume icon in the sidebar', () => {
  cy.get('.sc-sidebar-item').eq(2).click();
});

Then(
  'I fill out the create volume form with SparseLoopDevice volume type and check if the status is Ready',
  function () {
    cy.route('GET', '/api/kubernetes/api/v1/persistentvolumes').as(
      'getPersistentVolumes',
    );
    const volumeNameSparseLoopDevice = `volume-${new Date().getTime()}`;
    const volumeCapacity = Cypress.env('volume_capacity');
    const volume_label_name = Cypress.env('volume_label_name');
    const volume_label_value = Cypress.env('volume_label_value');

    cy.get('input[name=name]').type(volumeNameSparseLoopDevice);

    cy.get('input[name=labelName]').type(volume_label_name);
    cy.get('input[name=labelValue]').type(volume_label_value);
    cy.get('[data-cy=add-volume-labels-button]').click();

    // node name
    cy.get('.sc-select').eq(0).click();
    cy.get('.sc-select__menu').eq(0).click();

    cy.get('.sc-select').eq(1).click();
    cy.get('.sc-select__menu').find('[data-cy=storageClass-metalk8s]').click();

    cy.get('.sc-select').eq(2).click();
    cy.get('.sc-select__menu')
      .find('[data-cy="type-sparseLoopDevice"]')
      .click();

    cy.get('input[name=sizeInput]').type(volumeCapacity);

    cy.get('.sc-select').eq(2).click();
    //cy.get('[data-cy="size-KiB"]').click(); leave it at the default value GiB

    cy.get('[data-cy="submit-create-volume"]').click();

    // Wait until the volume is ready
    cy.waitUntil(
      () =>
        cy
          .get('[data-cy=volume_status_value]')
          .then(($span) => $span.text() === 'Ready'),
      {
        errorMsg: `Volume ${volumeNameSparseLoopDevice} is not ready`,
        timeout: 120000, // waits up to 120000 ms, default to 5000
        interval: 5000, // performs the check every 5000 ms, default to 200
      },
    );

    // Check if all the labels are presents
    cy.get('[data-cy=volume_label_name]').should('contain', volume_label_name);
    cy.get('[data-cy=volume_label_value]').should(
      'contain',
      volume_label_value,
    );
  },
);
