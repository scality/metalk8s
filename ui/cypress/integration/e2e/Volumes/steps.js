import { And, Then, When } from 'cypress-cucumber-preprocessor/steps';

And('I am on the volume creation page', () => {
  cy.visit('/volumes');
  cy.get('[data-cy="create_volume_button"]').click();
});

When('I fill out the volume creation form using:', (dataTable) => {
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
  cy.findByText(/node \*/i)
    .closest('label')
    .invoke('attr', 'for')
    .then((htmlFor) => cy.get(`#${htmlFor}`).click());
  cy.findAllByRole('option')[0].click();

  cy.findByText(/storage class \*/i)
    .closest('label')
    .invoke('attr', 'for')
    .then((htmlFor) => cy.get(`#${htmlFor}`).click());
  cy.findByRole('option', { name: new RegExp(`metalk8s`, 'i') }).click();

  cy.findByText(/type \*/i)
    .closest('label')
    .invoke('attr', 'for')
    .then((htmlFor) => cy.get(`#${htmlFor}`).click());
  cy.findByRole('option', { name: new RegExp(`${volumeType}`, 'i') }).click();

  cy.get('input[name=sizeInput]').type(volumeSize);
});

And('I click [Create] button', () => {
  cy.get('[data-cy="submit-create-volume"]').click();
});

Then(`I am redirected to the {string} volume page`, (volumeName) => {
  cy.location('pathname').should('eq', `/volumes/${volumeName}/overview`);
});

And(`the volume {string} becomes Ready`, (volumeName) => {
  // Check if the right side panel updates
  cy.get('[data-cy="volume_detail_card_name"]').should('contain', volumeName);
  // Wait until the volume is ready
  cy.waitUntil(
    () =>
      cy
        .get('[data-cy=volume_status_value]')
        .then(($span) => $span.text() === 'Ready'),
    {
      errorMsg: `Volume ${volumeName} is not ready`,
      timeout: 120000, // waits up to 120000 ms, default to 5000
      interval: 5000, // performs the check every 5000 ms, default to 200
    },
  );
});

And('the labels the volume include:', (dataTable) => {
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

Then(`the {string} volume is removed from the list`, (volumeName) => {
  cy.contains('[data-cy=volume_table_name_cell]', volumeName, {
    timeout: 120000,
  }).should('not.exist');
});
