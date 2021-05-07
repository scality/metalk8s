const VOLUME_NAME = 'test-volume-sparse';
const STORAGECLASS = 'metalk8s';
const NODE_NAME = 'bootstrap';
const VOLUME_LABEL_NAME = 'kubernetes.io/name';
const VOLUME_LABEL_INVALID = 'invaid&/name';
const VOLUME_LABEL_VALUE = 'test';
const VOLUME_TYPE = 'sparseLoopDevice';
const VOLUME_SIZE = '1 GiB';

beforeEach(() => {
  cy.setupMocks();
  cy.login();
  cy.visit('/volumes/createVolume');

  // The following steps are to fill the required fields of create volume form
  cy.get('input[name=name]').type(VOLUME_NAME);
  cy.findByText(/node\*/i)
    .next('.sc-input-wrapper')
    .click();
  cy.findByText(NODE_NAME).click();

  cy.findByText(/storage class\*/i)
    .next('.sc-input-wrapper')
    .click();
  /* we use `data-cy` is because the name of storageClass may display in both the select list and selected item, 
     so we must use unique selector to make sure to choose the item in the list. */
  cy.get('.sc-select__menu')
    .find(`[data-cy=storageClass-${STORAGECLASS}]`)
    .click();
  cy.findByText(/type\*/i)
    .next('.sc-input-wrapper')
    .click();
  cy.get('.sc-select__menu').find(`[data-cy="type-${VOLUME_TYPE}"]`).click();
  cy.get('input[name=sizeInput]').type(VOLUME_SIZE);
});

// interaction test for creating volume
describe('the create button in create volume page', () => {
  it('should be enabled and the Add button should be disabled when no labels is specified', () => {
    cy.findByRole('button', { name: /create/i }).should('be.enabled');
    cy.findByRole('button', { name: /add/i }).should('be.disabled');
  });

  it('should be disabled before adding the valid label', () => {
    cy.findByPlaceholderText(/Enter label name/i).type(VOLUME_LABEL_NAME);
    cy.findByPlaceholderText(/Enter label value/i).type(VOLUME_LABEL_VALUE);

    cy.findByRole('button', { name: /create/i }).should('be.disabled');
    cy.findByRole('button', { name: /add/i }).should('be.enabled');
  });

  it('should be disabled as well as the Add button if labelName is not valid', () => {
    cy.findByPlaceholderText(/Enter label name/i).type(VOLUME_LABEL_INVALID);
    cy.findByPlaceholderText(/Enter label value/i).type(VOLUME_LABEL_VALUE);

    cy.findByRole('button', { name: /create/i }).should('be.disabled');
    cy.findByRole('button', { name: /add/i }).should('be.disabled');
  });
});
