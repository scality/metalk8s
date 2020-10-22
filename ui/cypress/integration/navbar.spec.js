beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

const translations = {
  EN: {
    product: 'MetalK8s Platform',
    documentation: 'Documentation',
    about: 'About',
  },
  FR: {
    product: 'Plateforme MetalK8s',
    documentation: 'Documentation',
    about: 'À propos',
  },
};

Object.keys(translations).map((lang) => {
  describe(`Navigation bar [${lang}]`, () => {
    beforeEach(() => {
      cy.window()
        .its('localStorage')
        .then((store) => store.setItem('language', lang));
      cy.visit(Cypress.env('target_url'));
    });

    it('displays the product name', () => {
      cy.get('.sc-navbar').contains(translations[lang].product);
    });

    it('displays the selected language', () => {
      cy.get('.sc-navbar .sc-dropdown:nth-child(1) .sc-trigger-text').should(
        'contain',
        lang,
      );
    });

    it('lets me select another language', () => {
      cy.get('.sc-navbar .sc-dropdown:nth-child(1)').click();

      const otherLang = lang === 'EN' ? 'FR' : 'EN';
      cy.get(`[data-cy=${otherLang}]`).click();

      cy.get('.sc-navbar .sc-dropdown:nth-child(1) .sc-trigger-text')
        .should('contain', otherLang)
        .should('not.contain', lang);
    });

    it('links to app details', () => {
      cy.window()
        .its('__history__')
        .then((history) => {
          cy.stub(history, 'push').as('historyPush');
        });
      cy.get('.sc-navbar .sc-dropdown:nth-child(2)').click();

      cy.get('.sc-navbar .sc-dropdown:nth-child(2)')
        .contains('li', translations[lang].about)
        .click();

      cy.get('@historyPush').should('be.calledWith', '/about');
    });

    it('links to documentation', () => {
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen');
      });

      cy.get('.sc-navbar .sc-dropdown:nth-child(2)').click();

      cy.get('.sc-navbar .sc-dropdown:nth-child(2)')
        .contains('li', translations[lang].documentation)
        .click();
      cy.get('@windowOpen').should('be.calledWith', '/docs/index.html');
    });
  });
});

describe('Navigation bar [common]', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('target_url'));
  });

  it('shows my username', () => {
    cy.get('[data-cy=user_dropdown]').contains('admin');
  });

  it('allows me to log out', () => {
    cy.window()
      .its('__store__')
      .invoke('getState')
      .should((state) => {
        // We need to wait for the manager to be initialized before stubbing
        // its `removeUser` method.
        expect(state.config.userManager).to.not.be.null;
      })
      .its('config.userManager')
      .then((manager) => {
        cy.stub(manager, 'removeUser').as('managerRemoveUser');
      });

    cy.get('[data-cy=user_dropdown]').click();
    cy.get('[data-cy=logout_button]').click();

    cy.get('@managerRemoveUser').should('be.called');
  });
});
