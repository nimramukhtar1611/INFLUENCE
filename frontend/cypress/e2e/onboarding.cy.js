describe('M2 Onboarding Flow', () => {
  beforeEach(() => {
    cy.mockAppShell();
  });

  it('validates required fields in signup step 1', () => {
    cy.visit('/signup');
    cy.contains('h2', 'Create Account').should('be.visible');

    cy.contains('button', 'Continue').click();

    cy.get('input[name="fullName"]').should('have.attr', 'required');
    cy.get('input[name="email"]').should('have.attr', 'required');
    cy.get('input[name="password"]').should('have.attr', 'required');

    cy.get('input[name="email"]').type('bad-email');
    cy.contains('button', 'Continue').click();
    cy.get('input[name="fullName"]').then(($input) => {
      expect($input[0].checkValidity()).to.equal(false);
    });
  });

  it('shows brand onboarding fields in step 2', () => {
    cy.visit('/signup');
    cy.contains('button', 'Brand').click();

    cy.get('input[name="fullName"]').type('Brand Owner');
    cy.get('input[name="email"]').type('brand@acme.com');
    cy.get('input[name="password"]').type('SecurePass1');
    cy.get('input[name="confirmPassword"]').type('SecurePass1');
    cy.contains('button', 'Continue').click();

    cy.contains('Brand Name').should('be.visible');
    cy.contains('Industry').should('be.visible');
    cy.contains('Verify reCAPTCHA').should('be.visible');
  });

  it('shows creator onboarding fields in step 2', () => {
    cy.visit('/signup?type=creator');
    cy.contains('button', 'Creator').click();

    cy.get('input[name="fullName"]').type('Creator User');
    cy.get('input[name="email"]').type('creator@example.com');
    cy.get('input[name="password"]').type('SecurePass1');
    cy.get('input[name="confirmPassword"]').type('SecurePass1');
    cy.contains('button', 'Continue').click();

    cy.contains('Display Name').should('be.visible');
    cy.contains('Handle').should('be.visible');
    cy.contains('Niche').should('be.visible');
  });
});
