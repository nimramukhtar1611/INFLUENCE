describe('M7 Payments & Escrow Flow', () => {
  beforeEach(() => {
    cy.mockAppShell();
  });

  it('renders balances, transactions, invoices, and methods with actionable controls', () => {
    cy.intercept('GET', '**/api/payments/balance*', {
      statusCode: 200,
      body: { success: true, balance: 4200, pending: 320 }
    }).as('getBalance');

    cy.intercept('GET', '**/api/payments/transactions*', {
      statusCode: 200,
      body: {
        success: true,
        transactions: [
          {
            _id: 'txn-1',
            transactionId: 'txn_0001',
            type: 'deposit',
            amount: 2500,
            fee: 35,
            status: 'completed',
            description: 'Wallet top-up',
            createdAt: '2031-02-01T00:00:00.000Z'
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }
    }).as('getTransactions');

    cy.intercept('GET', '**/api/payments/methods*', {
      statusCode: 200,
      body: {
        success: true,
        paymentMethods: [
          {
            _id: 'pm-1',
            type: 'credit_card',
            brand: 'visa',
            last4: '4242',
            expiryMonth: '12',
            expiryYear: '2032',
            isDefault: false
          }
        ]
      }
    }).as('getMethods');

    cy.intercept('GET', '**/api/payments/invoices*', {
      statusCode: 200,
      body: {
        success: true,
        invoices: [
          {
            _id: 'inv-1',
            invoiceNumber: 'INV-1001',
            amount: 450,
            status: 'paid',
            createdAt: '2031-02-02T00:00:00.000Z'
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }
    }).as('getInvoices');

    cy.intercept('PUT', '**/api/payments/methods/pm-1/default*', {
      statusCode: 200,
      body: { success: true }
    }).as('setDefaultMethod');

    cy.visitAsUser('/brand/payments', { userType: 'brand' });
    cy.wait('@getBalance');
    cy.wait('@getTransactions');
    cy.wait('@getMethods');
    cy.wait('@getInvoices');

    cy.contains('h1', 'Payments').should('be.visible');
    cy.contains('Available Balance').should('be.visible');
    cy.contains('Recent Transactions').should('be.visible');

    cy.contains('button', 'Transactions').click();
    cy.contains('All Transactions').should('be.visible');
    cy.contains('txn_0001').should('be.visible');

    cy.contains('button', 'Invoices').click();
    cy.contains('h2', 'Invoices').should('be.visible');
    cy.get('tbody tr').should('have.length.at.least', 1);
    cy.contains('INV-1001').should('exist');

    cy.contains('button', 'Payment Methods').click();
    cy.contains('Set Default').click();
    cy.wait('@setDefaultMethod');
  });
});
