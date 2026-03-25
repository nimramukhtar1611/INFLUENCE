describe('M6 Delivery & Approval Flow', () => {
  beforeEach(() => {
    cy.mockAppShell();
  });

  it('shows creator deliverables and submits a link payload', () => {
    cy.intercept('GET', '**/deals/deal-123*', {
      statusCode: 200,
      body: {
        success: true,
        deal: {
          _id: 'deal-123',
          status: 'in-progress',
          deadline: '2031-05-15T00:00:00.000Z',
          brandId: { brandName: 'Acme Labs' },
          campaignId: { title: 'Spring Launch', brandAssets: [] },
          deliverables: [
            {
              _id: 'deliv-1',
              type: 'post',
              platform: 'instagram',
              quantity: 1,
              status: 'pending',
              description: 'Launch teaser post',
              requirements: 'Include product close-up and CTA',
              files: []
            }
          ]
        }
      }
    }).as('getDeal');

    cy.intercept('POST', '**/deals/deal-123/deliverables*', {
      statusCode: 200,
      body: { success: true }
    }).as('submitDeliverables');

    cy.visitAsUser('/creator/deliverables/deal-123', { userType: 'creator' });
    cy.wait('@getDeal');

    cy.contains('h1', 'Submit Deliverables').should('be.visible');
    cy.contains('Launch teaser post').should('be.visible');
    cy.contains('button', 'Submit Deliverables').should('be.disabled');

    cy.get('input[type="url"]').first().type('https://instagram.com/p/test-content');
    cy.contains('button', 'Submit Deliverables').should('not.be.disabled').click();

    cy.wait('@submitDeliverables').its('request.body').should((body) => {
      expect(body.deliverables).to.have.length(1);
      expect(body.deliverables[0].deliverableId).to.equal('deliv-1');
      expect(body.deliverables[0].links[0]).to.contain('test-content');
    });

    cy.url().should('include', '/creator/deals/deal-123');
  });
});
