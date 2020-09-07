import { And, Then, When } from 'cypress-cucumber-preprocessor/steps';

And('I am on the volume creation page', () => {
  cy.get('.sc-sidebar-item').eq(2).click();
  cy.get('[data-cy="create-volume-button"]').click();
});

When('I fill out the volume creation form using:', (dataTable) => {
  cy.route('GET', '/api/kubernetes/api/v1/persistentvolumes').as(
    'getPersistentVolumes',
  );

  // rowsHash: returns an object where each row corresponds to an entry (first column is the key, second column is the value).
  const dataTableObject = dataTable.rowsHash();

  const volumeName = dataTableObject.name;
  const volumeType = dataTableObject.type;
  const volumeSize = dataTableObject.size.split(' ')[0];
  const volumeLabelName = dataTableObject.labelName;
  const volumeLabelValue = dataTableObject.labelValue;

  cy.get('input[name=name]').type(volumeName);
  cy.get('input[name=labelName]').type(volumeLabelName);
  cy.get('input[name=labelValue]').type(volumeLabelValue);
  cy.get('[data-cy=add-volume-labels-button]').click();

  // node name
  cy.get('.sc-select').eq(0).click();
  cy.get('.sc-select__menu').eq(0).click();

  cy.get('.sc-select').eq(1).click();
  cy.get('.sc-select__menu').find('[data-cy=storageClass-metalk8s]').click();

  cy.get('.sc-select').eq(2).click();
  cy.get('.sc-select__menu').find(`[data-cy="type-${volumeType}"]`).click();

  cy.get('input[name=sizeInput]').type(volumeSize);
});

And('I click [Create] button', () => {
  cy.get('[data-cy="submit-create-volume"]').click();
});

Then('I am redirected to the "test-volume-sparse" volume page', () => {
  cy.location('pathname').should('eq', '/volumes/test-volume-sparse');
});

And('the volume "test-volume-sparse" becomes Ready', () => {
  // Check if the right side panel updates
  cy.get('[data-cy="volume_detail_card_name"]').should(
    'contain',
    'test-volume-sparse',
  );
  // Wait until the volume is ready
  cy.waitUntil(
    () =>
      cy
        .get('[data-cy=volume_status_value]')
        .then(($span) => $span.text() === 'Ready'),
    {
      errorMsg: `Volume test-volume-sparse is not ready`,
      timeout: 120000, // waits up to 120000 ms, default to 5000
      interval: 5000, // performs the check every 5000 ms, default to 200
    },
  );
});

And('the label of volume "test-volume-sparse" presents:', (dataTable) => {
  const dataTableObject = dataTable.rowsHash();

  const volumeLabelName = dataTableObject.labelName;
  const volumeLabelValue = dataTableObject.labelValue;

  cy.get('[data-cy="volume_label_name"]').should('contain', volumeLabelName);
  cy.get('[data-cy="volume_label_value"]').should('contain', volumeLabelValue);
});

When('I click [Delete] button', () => {
  cy.get('[data-cy="delete_volume_button"]').click({ force: true });
});

And('I confirm the deletion', () => {
  cy.get('[data-cy="confirm_deletion_button"]').click();
});

Then('the "test-volume-sparse" volume is removed from the list', () => {
  // fiter delete this volume, we should only have 3 default volume in CI.
  cy.waitUntil(
    () =>
      cy.get('[data-cy="volume_table_row"]').then(($el) => $el.length === 3),
    {
      errorMsg: `Volume test-volume-sparse is not deleted`,
      timeout: 120000, // waits up to 120000 ms, default to 5000
      interval: 5000, // performs the check every 5000 ms, default to 200
    },
  );
});
