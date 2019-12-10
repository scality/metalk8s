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
  'I fill out the create volume form with SparseLoopDevice volume type and ckeck if the volume is created correctly',
  function() {
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
    //cy.get('[data-cy="size-KiB"]').click(); leave it at the default value GiB

    cy.get('[data-cy="submit-create-volume"]').click();

    //Check if the volume is created
    cy.get('input[name=search]').type(volumeNameSparseLoopDevice);

    cy.get('.sc-table-row')
      .eq(1) //2 rows with the header included
      .find('.sc-table-column-cell-name')
      .should('contain', volumeNameSparseLoopDevice);

    // Wait until the volume is available
    cy.waitUntil(
      () =>
        cy
          .get('.sc-table-row')
          .eq(1) //2 rows with the header included
          .find('.sc-table-column-cell-status')
          .then($span => $span.text() === 'Available'),
      {
        errorMsg: `Volume ${volumeNameSparseLoopDevice} is not available`,
        timeout: 120000, // waits up to 120000 ms, default to 5000
        interval: 5000, // performs the check every 5000 ms, default to 200
      },
    );

    //Go to the volume Information page
    cy.get('.sc-table-row')
      .eq(1) //2 rows with the header included
      .click();

    //Check if all the labels are present
    cy.get('.sc-table-row')
      .eq(1) //2 rows with the header included
      .find('.sc-table-column-cell-name')
      .should('contain', volume_label_name);
    cy.get('.sc-table-row')
      .eq(1) //2 rows with the header included
      .find('.sc-table-column-cell-value')
      .should('contain', volume_label_value);
  },
);
