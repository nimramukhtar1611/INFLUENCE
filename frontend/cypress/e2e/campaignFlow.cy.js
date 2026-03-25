describe('M3 Campaign Flow', () => {
  const seenStatuses = [];

  beforeEach(() => {
    cy.mockAppShell({ skipCampaignMocks: true });
    seenStatuses.length = 0;
  });

  it('loads brand campaigns and applies status filters', () => {
    cy.intercept('GET', '**/campaigns/brand*', (req) => {
      const status = req.query.status || 'all';
      seenStatuses.push(status);
      const allCampaigns = [
        {
          _id: 'camp-1',
          title: 'Spring Launch',
          status: 'active',
          budget: 1500,
          spent: 700,
          startDate: '2031-03-01T00:00:00.000Z'
        },
        {
          _id: 'camp-2',
          title: 'Draft Campaign',
          status: 'draft',
          budget: 900,
          spent: 0,
          startDate: '2031-03-15T00:00:00.000Z'
        }
      ];

      const filtered = status === 'all' ? allCampaigns : allCampaigns.filter((c) => c.status === status);

      req.reply({
        statusCode: 200,
        body: {
          success: true,
          campaigns: filtered,
          counts: { active: 1, draft: 1, completed: 0, paused: 0, pending: 0 },
          pagination: { page: 1, limit: 10, total: filtered.length, pages: 1 }
        }
      });
    }).as('getCampaigns');

    cy.visitAsUser('/brand/campaigns', { userType: 'brand' });
    cy.contains('h1', 'Campaigns', { timeout: 20000 }).should('be.visible');
    cy.contains('Spring Launch').should('be.visible');

    cy.contains('button', 'active').click();
    cy.wait('@getCampaigns', { timeout: 20000 });
    cy.wrap(seenStatuses).should('include', 'active');
    cy.contains('Spring Launch').should('be.visible');
  });

  it('validates and submits campaign builder flow through review', () => {
    cy.intercept('POST', '**/campaigns', {
      statusCode: 200,
      body: {
        success: true,
        campaign: { _id: 'camp-new-1', title: 'Creator Growth Sprint' }
      }
    }).as('createCampaign');

    cy.intercept('GET', '**/campaigns/camp-new-1*', {
      statusCode: 200,
      body: {
        success: true,
        campaign: {
          _id: 'camp-new-1',
          title: 'Creator Growth Sprint',
          status: 'draft',
          deliverables: []
        }
      }
    });

    cy.visitAsUser('/brand/campaigns/new', { userType: 'brand' });

    cy.contains('button', 'Next').click();
    cy.contains('Campaign title is required').should('exist');

    cy.contains('label', 'Campaign Title').parent().find('input').type('Creator Growth Sprint');
    cy.contains('label', 'Campaign Description').parent().find('textarea').type('Detailed campaign brief for creator collaborations across social channels.');
    cy.contains('label', 'Category').parent().find('select').select('Technology');
    cy.contains('button', 'Next').click();

    cy.contains('button', 'Next').click();

    cy.contains('label', 'Campaign Start Date').parent().find('input[type="date"]').type('2031-04-01');
    cy.contains('label', 'Campaign End Date').parent().find('input[type="date"]').type('2031-04-20');
    cy.contains('button', 'Next').click();

    cy.contains('label', 'Total Campaign Budget').parent().find('input[type="number"]').clear().type('3000');
    cy.contains('button', 'Next').click();

    cy.contains('button', 'Next').click();
    cy.contains('button', 'Launch Campaign').click();

    cy.wait('@createCampaign').its('request.body').should((body) => {
      expect(body.title).to.equal('Creator Growth Sprint');
      expect(body.budget).to.equal(3000);
    });

    cy.url().should('include', '/brand/campaigns/camp-new-1');
  });
});
