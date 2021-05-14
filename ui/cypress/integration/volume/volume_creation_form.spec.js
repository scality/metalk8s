const VOLUME_LABEL_NAME = 'kubernetes.io/name';
const VOLUME_LABEL_INVALID = 'invaid&/name';
const VOLUME_LABEL_VALUE = 'test';

beforeEach(() => {
  cy.setupMocks();
  cy.login();
  cy.visit('/volumes/createVolume');
  cy.fillVolumeCreationForm();
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
