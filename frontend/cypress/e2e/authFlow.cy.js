describe('M1 Auth & Security Flow', () => {
  const stubBrandDashboardApis = () => {
    cy.intercept('GET', '**/api/brands/profile*', {
      statusCode: 200,
      body: { success: true, brand: { brandName: 'Acme Labs' } }
    }).as('getBrandProfile');

    cy.intercept('GET', '**/api/campaigns/brand*', {
      statusCode: 200,
      body: {
        success: true,
        campaigns: [
          {
            _id: 'camp-1',
            title: 'Spring Launch',
            status: 'active',
            creatorCount: 3,
            budget: 1200,
            spent: 600
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
        counts: { active: 1, draft: 0, completed: 0 }
      }
    }).as('getCampaigns');

    cy.intercept('GET', '**/api/deals/brand*', {
      statusCode: 200,
      body: {
        success: true,
        deals: [
          {
            _id: 'deal-1',
            status: 'accepted',
            budget: 700,
            campaignId: { title: 'Spring Launch' },
            creatorId: { displayName: 'Creator One', handle: '@creatorone' },
            deadline: '2031-01-01T00:00:00.000Z',
            progress: 45,
            paymentStatus: 'in-escrow',
            messages: []
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }
    }).as('getDeals');

    cy.intercept('GET', '**/api/payments/balance*', {
      statusCode: 200,
      body: { success: true, balance: 2500, pending: 350 }
    }).as('getBalance');

    cy.intercept('GET', '**/api/payments/transactions*', {
      statusCode: 200,
      body: {
        success: true,
        transactions: [
          {
            _id: 'txn-1',
            transactionId: 'txn_1001',
            type: 'deposit',
            amount: 1000,
            status: 'completed',
            createdAt: '2030-01-10T00:00:00.000Z'
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }
    }).as('getTransactions');

    cy.intercept('GET', '**/api/brands/analytics*', {
      statusCode: 200,
      body: {
        success: true,
        analytics: {
          summary: { avgROI: 2.3 },
          campaignPerformance: [{ _id: { month: 3, day: 10 }, spent: 700, campaigns: 1 }],
          platforms: [{ _id: 'instagram', count: 1 }]
        }
      }
    }).as('getAnalytics');
  };

  beforeEach(() => {
    cy.mockAppShell();
  });

  it('shows login validation errors for empty submit', () => {
    cy.visit('/login');
    cy.contains('h2', 'Welcome Back').should('be.visible');

    cy.contains('button', 'Sign In').click();

    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });

  it('logs in as brand and redirects to brand dashboard with data loaded', () => {
    cy.intercept('POST', '**/api/auth/login', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          token: 'brand-token',
          refreshToken: 'brand-refresh',
          user: {
            _id: 'brand-user-1',
            userType: 'brand',
            email: 'brand@example.com',
            fullName: 'Brand Owner',
            brandName: 'Acme Labs'
          }
        }
      });
    }).as('loginRequest');

    stubBrandDashboardApis();

    cy.visit('/login');
    cy.contains('button', 'Brand').click();
    cy.get('input[type="email"]').type('brand@example.com');
    cy.get('input[type="password"]').type('StrongPass1!');
    cy.contains('button', 'Sign In').click();

    cy.wait('@loginRequest').its('request.body').should((body) => {
      expect(body.userType).to.equal('brand');
      expect(body.email).to.equal('brand@example.com');
    });

    cy.url().should('include', '/brand/dashboard');
    cy.contains('h1', 'Brand Dashboard').should('be.visible');
    cy.contains('Total Campaigns').should('be.visible');
    cy.wait('@getBrandProfile');
    cy.wait('@getAnalytics');
  });

  it('redirects unauthenticated users and blocks cross-role admin access', () => {
    cy.visit('/brand/dashboard');
    cy.url().should('include', '/login');

    stubBrandDashboardApis();
    cy.visitAsUser('/admin/dashboard', { userType: 'brand' });
    cy.url().should('include', '/brand/dashboard');
  });
});
