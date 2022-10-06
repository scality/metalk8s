const VOLUME_LABEL_NAME = 'kubernetes.io/name';
const VOLUME_LABEL_INVALID = 'invaid&/name';
const VOLUME_LABEL_VALUE = 'test';
const VOLUME_TYPE_SPARSELOOP = 'sparseLoopDevice';
const VOLUME_TYPE_LVM = 'LVMLogicalVolume';

// interaction test for creating volume
describe('the create button when creating sparseloop volume', () => {
  beforeEach(() => {
    cy.setupMocks();
    cy.login();
    cy.visit('/volumes/createVolume');
    cy.fillVolumeCreationForm(VOLUME_TYPE_SPARSELOOP);
  });
  it('should be enabled and the Add button should be disabled when no labels is specified', () => {
    cy.findByRole('button', { name: /create/i }).should('be.enabled');
    cy.findByRole('button', { name: /add/i }).should('be.disabled');
  });

  it('should be disabled before adding the valid label', () => {
    cy.findByPlaceholderText(/Example: name/i).type(VOLUME_LABEL_NAME);
    cy.findByPlaceholderText(/Example: value/i).type(VOLUME_LABEL_VALUE);

    cy.findByRole('button', { name: /create/i }).should('be.disabled');
    cy.findByRole('button', { name: /add/i }).should('be.enabled');
  });

  it('should be disabled as well as the Add button if labelName is not valid', () => {
    cy.findByPlaceholderText(/Example: name/i).type(VOLUME_LABEL_INVALID);
    cy.findByPlaceholderText(/Example: value/i).type(VOLUME_LABEL_VALUE);

    cy.findByRole('button', { name: /create/i }).should('be.disabled');
    cy.findByRole('button', { name: /add/i }).should('be.disabled');
  });
});

describe('the create button when creating LVM Logical volume', () => {
  beforeEach(() => {
    cy.setupMocks();
    cy.login();
    cy.visit('/volumes/createVolume');
    cy.fillVolumeCreationForm(VOLUME_TYPE_LVM);
  });

  it('should be enable when all the required fields are filled', () => {
    cy.findByRole('button', { name: /create/i }).should('be.disabled');
    cy.get('input[name=vgName]').type('my-vg');
    cy.findByRole('button', { name: /create/i }).should('be.enabled');
  });
});
