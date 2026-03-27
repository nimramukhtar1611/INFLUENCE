describe('M2 Creator Dashboard Flow', () => {
  beforeEach(() => {
    const creatorUser = {
      _id: 'creator-user-1',
      fullName: 'Creator One',
      email: 'creator@example.com',
      userType: 'creator',
      displayName: 'Creator One',
      handle: '@creatorone'
    };

    cy.mockAppShell({ authUser: creatorUser });

    cy.intercept('GET', '**/api/creators/profile/me*', {
      statusCode: 200,
      body: {
        success: true,
        creator: {
          _id: 'creator-user-1',
          displayName: 'Creator One',
          handle: '@creatorone',
          niches: ['Lifestyle', 'Travel'],
          isVerified: true,
          totalFollowers: 82000,
          averageEngagement: 3.9,
          socialMedia: {
            instagram: { followers: 52000 },
            youtube: { subscribers: 24000 },
            tiktok: { followers: 6000 }
          },
          stats: { averageRating: 4.7 }
        }
      }
    }).as('getCreatorProfile');

    cy.intercept('GET', '**/api/creators/dashboard*', {
      statusCode: 200,
      body: {
        success: true,
        dashboard: {
          summary: { activeDeals: 1, completedDeals: 2 }
        }
      }
    }).as('getCreatorDashboard');

    cy.intercept('GET', '**/api/deals/creator*', {
      statusCode: 200,
      body: {
        success: true,
        deals: [
          {
            _id: 'deal-creator-1',
            status: 'accepted',
            budget: 900,
            progress: 45,
            deadline: '2031-02-01T00:00:00.000Z',
            updatedAt: '2031-01-10T00:00:00.000Z',
            createdAt: '2031-01-05T00:00:00.000Z',
            campaignId: { title: 'Summer Product Push' },
            brandId: { brandName: 'Acme Labs' },
            deliverables: [{ type: 'reel' }]
          }
        ],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 }
      }
    }).as('getCreatorDeals');

    cy.intercept('GET', '**/api/campaigns/available*', {
      statusCode: 200,
      body: {
        success: true,
        campaigns: [
          {
            _id: 'campaign-1',
            title: 'Summer Product Push',
            budget: 1200
          }
        ],
        pagination: { page: 1, limit: 6, total: 1, pages: 1 }
      }
    }).as('getAvailableCampaigns');

    cy.intercept('GET', '**/api/payments/balance*', {
      statusCode: 200,
      body: {
        success: true,
        balance: 2450,
        pending: 420
      }
    }).as('getBalance');

    cy.intercept('GET', '**/api/payments/transactions*', {
      statusCode: 200,
      body: {
        success: true,
        transactions: [
          {
            _id: 'txn-creator-1',
            transactionId: 'txn_creator_001',
            type: 'payment',
            amount: 900,
            status: 'completed',
            createdAt: '2031-01-09T00:00:00.000Z'
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }
    }).as('getTransactions');

    cy.intercept('GET', '**/api/creators/earnings/summary*', {
      statusCode: 200,
      body: {
        success: true,
        summary: {
          total: 9800,
          thisMonth: 1800,
          averageDealValue: 700
        }
      }
    }).as('getEarningsSummary');

    cy.intercept('GET', '**/api/creators/earnings/history*', {
      statusCode: 200,
      body: {
        success: true,
        history: [
          { date: '2031-01-01', amount: 900 },
          { date: '2031-01-10', amount: 1800 }
        ]
      }
    }).as('getEarningsHistory');

    cy.intercept('GET', '**/api/creators/analytics*', {
      statusCode: 200,
      body: {
        success: true,
        analytics: {
          monthly: [
            { month: 'Jan', earnings: 1800, deals: 2 }
          ],
          platforms: [
            { name: 'instagram', followers: 52000 },
            { name: 'youtube', followers: 24000 },
            { name: 'tiktok', followers: 6000 }
          ]
        }
      }
    }).as('getCreatorAnalytics');
  });

  it('renders dashboard data for a creator and allows quick navigation', () => {
    cy.visitAsUser('/creator/dashboard', { userType: 'creator' });

    cy.wait('@getCreatorProfile');
    cy.wait('@getCreatorDeals');
    cy.wait('@getBalance');
    cy.wait('@getCreatorAnalytics');

    cy.contains('h1', 'Welcome back, Creator One!').should('be.visible');
    cy.contains('h2', 'Active Deals').should('be.visible');
    cy.contains('h2', 'Platform Distribution').should('be.visible');
    cy.contains('h2', 'Upcoming Deadlines').should('be.visible');
    cy.contains('h2', 'Quick Actions').should('be.visible');

    cy.contains('Summer Product Push').should('be.visible');
    cy.contains('Acme Labs').should('be.visible');
    cy.contains('Available Balance').should('be.visible');

    cy.contains('button', 'Find Deals').click();
    cy.url().should('include', '/creator/available-deals');
  });
});