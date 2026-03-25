describe('M5 Deal Management Flow', () => {
  const seenStatuses = [];

  beforeEach(() => {
    cy.mockAppShell();
    seenStatuses.length = 0;
  });

  it('renders brand deals table and filters by status', () => {
    cy.intercept('GET', '**/api/deals/brand*', (req) => {
      const status = req.query.status || '';
      seenStatuses.push(status || 'all');

      const allDeals = [
        {
          _id: 'deal-101',
          campaignId: { title: 'Spring Launch' },
          creatorId: { displayName: 'Travel Pro', handle: '@travelpro' },
          budget: 1200,
          status: 'pending',
          deadline: '2031-04-15T00:00:00.000Z',
          progress: 0,
          paymentStatus: 'pending',
          messages: []
        },
        {
          _id: 'deal-202',
          campaignId: { title: 'Creator Growth Sprint' },
          creatorId: { displayName: 'Tech Lens', handle: '@techlens' },
          budget: 1800,
          status: 'accepted',
          deadline: '2031-04-25T00:00:00.000Z',
          progress: 35,
          paymentStatus: 'in-escrow',
          messages: [{ _id: 'm-1' }]
        }
      ];

      const filtered = !status ? allDeals : allDeals.filter((d) => d.status === status);

      req.reply({
        statusCode: 200,
        body: {
          success: true,
          deals: filtered,
          pagination: { page: 1, limit: 10, total: filtered.length, pages: 1 }
        }
      });
    }).as('getBrandDeals');

    cy.visitAsUser('/brand/deals', { userType: 'brand' });
    cy.wait('@getBrandDeals');

    cy.contains('h1', 'Deals').should('be.visible');
    cy.contains('Total Deals').should('exist');
    cy.contains('Spring Launch').should('exist');
    cy.contains('Tech Lens').should('exist');

    cy.contains('button', 'Pending').click();
    cy.wait('@getBrandDeals');
    cy.wrap(seenStatuses).should('include', 'pending');

    cy.get('a[href="/brand/deals/deal-101"]').should('exist');
  });
});
