import { And, Then } from 'cypress-cucumber-preprocessor/steps';

And(
  'I go to the bootstrap node by click on the bootstrap row in the list',
  () => {
    cy.get('.sc-table-row')
      .eq(1)
      .click();
  }
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

    cy.get('[data-cy="submit-create-volume"]').click();

    cy.get('.sc-table-column-cell-name').should(
      'contain',
      volumeNameRawBlockDevice
    );
  }
);

Then(
  'I fill out the create volume form with SparseLoopDevice volume type and ckeck if the the volume I created is displayed on the volume list',
  () => {
    const volumeNameSparseLoopDevice = `volume-${new Date().getTime()}`;
    const devicePath = Cypress.env('device_path');
    const volumeCapacity = Cypress.env('volume_capacity');

    cy.get('input[name=name]').type(volumeNameSparseLoopDevice);
    cy.get('input[name=path]').type(devicePath);

    cy.get('.Select')
      .eq(1)
      .click();

    cy.get('[data-cy="type-sparseLoopDevice"]').click();

    cy.get('input[name=sizeInput]').type(volumeCapacity);

    cy.get('.Select')
      .eq(2)
      .click();
    cy.get('[data-cy="size-GiB"]').click();

    cy.get('[data-cy="submit-create-volume"]').click();
    cy.get('.sc-table-column-cell-name').should(
      'contain',
      volumeNameSparseLoopDevice
    );
  }
);
