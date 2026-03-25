describe('M4 Search & Match Flow', () => {
  beforeEach(() => {
    cy.mockAppShell();
  });

  it('loads creator search results and applies query filters', () => {
    cy.intercept('GET', '**/api/brands/creators/search*', (req) => {
      const q = (req.query.q || '').toLowerCase();
      const niche = req.query.niche || '';

      const creators = [
        {
          _id: 'creator-1',
          displayName: 'Travel Pro',
          handle: '@travelpro',
          niches: ['Travel'],
          totalFollowers: 56000,
          averageEngagement: 4.2,
          socialMedia: { instagram: true },
          stats: { completedDeals: 8, averageRating: 4.6 }
        },
        {
          _id: 'creator-2',
          displayName: 'Tech Lens',
          handle: '@techlens',
          niches: ['Tech'],
          totalFollowers: 42000,
          averageEngagement: 3.9,
          socialMedia: { youtube: true },
          stats: { completedDeals: 4, averageRating: 4.4 }
        }
      ];

      const filtered = creators.filter((c) => {
        const matchesQ = !q || c.displayName.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
        const matchesNiche = !niche || c.niches.includes(niche);
        return matchesQ && matchesNiche;
      });

      req.reply({
        statusCode: 200,
        body: {
          success: true,
          creators: filtered,
          pagination: { page: 1, limit: 10, total: filtered.length, pages: 1 }
        }
      });
    }).as('searchCreators');

    cy.visitAsUser('/brand/search', { userType: 'brand' });
    cy.wait('@searchCreators');

    cy.contains('h1', 'Find Creators').should('be.visible');
    cy.contains('Travel Pro').should('be.visible');

    cy.get('input[placeholder*="Search by name"]').type('travel');
    cy.wait('@searchCreators');
    cy.contains('Travel Pro').should('be.visible');
    cy.contains('Tech Lens').should('not.exist');

    cy.contains('button', 'Filters').click();
    cy.contains('label', 'Niche').parent().find('select').select('Travel');
    cy.wait('@searchCreators');
    cy.contains('Travel Pro').should('be.visible');

    cy.contains('button', 'Send Offer').first().click();
    cy.url().should('include', '/brand/createdeal?creator=');
  });
});
