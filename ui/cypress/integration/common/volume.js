import { And, Then } from 'cypress-cucumber-preprocessor/steps';

And(
  'I go to the bootstrap node by click on the bootstrap row in the list',
  () => {
    cy.get('.sc-table-row')
      .eq(1)
      .click();
  },
);

And('I choose the Volumes tag', () => {
  cy.get('.sc-tabs-bar .sc-tabs-item-title')
    .eq(1)
    .click();
});

And('I go to create volume page by click on Create a New Volume button', () => {
  cy.get('[data-cy="create-volume-button"]').click();
});

Then(
  'I fill out the create volume form with RawBlockDevice volume type and ckeck if the the volume I created is displayed on the volume list',
  () => {
    const volumeNameRawBlockDevice = `volume-${new Date().getTime()}`;
    const devicePath = Cypress.env('device_path');

    cy.get('input[name=name]').type(volumeNameRawBlockDevice);
    cy.get('input[name=path]').type(devicePath);

    cy.get('.sc-select')
      .eq(0)
      .click();
    cy.get('.sc-select__menu')
      .find('[data-cy=storageClass-metalk8s-prometheus]')
      .click();

    cy.get('.sc-select')
      .eq(1)
      .click();
    cy.get('.sc-select__menu')
      .find('[data-cy="type-rawBlockDevice"]')
      .click();

    cy.get('[data-cy="submit-create-volume"]').click();

    cy.get('.sc-table-column-cell-name').should(
      'contain',
      volumeNameRawBlockDevice,
    );
  },
);

Then(
  'I fill out the create volume form with SparseLoopDevice volume type and ckeck if the the volume I created is displayed on the volume list',
  () => {
    const volumeNameSparseLoopDevice = `volume-${new Date().getTime()}`;
    const volumeCapacity = Cypress.env('volume_capacity');

    cy.get('input[name=name]').type(volumeNameSparseLoopDevice);
    cy.get('.sc-select')
      .eq(0)
      .click();
    cy.get('.sc-select__menu')
      .find('[data-cy=storageClass-metalk8s-prometheus]')
      .click();

    cy.get('.sc-select')
      .eq(1)
      .click();
    cy.get('.sc-select__menu')
      .find('[data-cy="type-sparseLoopDevice"]')
      .click();

    cy.get('input[name=sizeInput]').type(volumeCapacity);

    cy.get('.sc-select')
      .eq(2)
      .click();
    cy.get('[data-cy="size-KiB"]').click();

    cy.get('[data-cy="submit-create-volume"]').click();
    cy.get('.sc-table-column-cell-name').should(
      'contain',
      volumeNameSparseLoopDevice,
    );
  },
);
