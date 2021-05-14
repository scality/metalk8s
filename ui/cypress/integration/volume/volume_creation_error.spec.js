// Test the error scenario of volume creation
beforeEach(() => {
  cy.setupMocks();
  cy.login();
  cy.visit('/volumes/createVolume');
  cy.fillVolumeCreationForm();
});

describe('volume creation fails', () => {
  it('should display a failed banner if the K8s API is not available', () => {
    cy.route2(
      'POST',
      '/api/kubernetes/apis/storage.metalk8s.scality.com/v1alpha1/volumes',
      {
        fixture: '/kubernetes/volumecreation.json',
        statusCode: 500,
      },
    );

    cy.findByRole('button', { name: /create/i }).click();

    // V
    cy.findByText(/Volume test-volume-sparse creation has failed./i).should(
      'exist',
    );
  });

  it('should display failed status', () => {
    cy.route2(
      'POST',
      '/api/kubernetes/apis/storage.metalk8s.scality.com/v1alpha1/volumes',
      {
        fixture: '/kubernetes/volumecreation.json',
      },
    );

    cy.route2(
      'GET',
      /^\/api\/kubernetes\/apis\/storage.metalk8s.scality.com\/v1alpha1\/volumes\/[a-z0-9_\-]+$/,
      { fixture: '/kubernetes/volumecreation.json' },
    );
    cy.findByRole('button', { name: /create/i }).click();

    // V
    cy.findByText(/Volume test-volume-sparse is being created./i).should(
      'exist',
    );
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq('/volumes/test-volume-sparse/overview');
      expect(loc.search).to.eq('?node=bootstrap');
    });

    cy.findByRole('button', { name: /delete volume/i }).should('be.enabled');
    cy.get('[data-cy="volume_status_value"]').contains('Failed');
    cy.get('[data-cy="volume_size_value"]').contains('Unknown');
  });
});
