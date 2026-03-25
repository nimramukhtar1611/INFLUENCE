describe('M9 Analytics Dashboard', () => {
  beforeEach(() => {
    cy.mockAppShell();
  });

  it('renders brand analytics charts and refreshes by date range', () => {
    cy.intercept('GET', '**/api/brands/analytics*', {
      statusCode: 200,
      body: {
        success: true,
        analytics: {
          summary: {
            totalCampaigns: 4,
            activeCampaigns: 2,
            totalDeals: 5,
            completedDeals: 3,
            totalSpent: 4800,
            avgROI: 2.8,
            avgEngagement: 4.2,
            avgRating: 4.7,
            totalLikes: 12500,
            totalComments: 900,
            totalShares: 620,
            totalImpressions: 210000
          },
          campaignPerformance: [
            { _id: { month: 1, day: 12 }, spent: 1600, campaigns: 1 },
            { _id: { month: 1, day: 26 }, spent: 2100, campaigns: 2 }
          ],
          platforms: [
            { _id: 'instagram', count: 3 },
            { _id: 'youtube', count: 1 }
          ]
        }
      }
    }).as('getBrandAnalytics');

    cy.visitAsUser('/brand/analytics', { userType: 'brand' });
    cy.wait('@getBrandAnalytics');

    cy.contains('h1', 'Analytics & Reports').should('exist');
    cy.contains('Campaign Performance').should('exist');
    cy.contains('Key Performance Indicators').should('exist');
    cy.contains('Deal Status').should('exist');

    cy.get('select').first().select('Last 7 Days');
    cy.wait('@getBrandAnalytics');

    cy.contains('button', 'bar').click();
    cy.contains('button', 'line').click();
  });

  it('renders creator analytics dashboard and chart controls', () => {
    cy.intercept('GET', '**/api/creators/analytics*', {
      statusCode: 200,
      body: {
        success: true,
        analytics: {
          summary: {
            totalEarnings: 9200,
            totalFollowers: 102000,
            averageEngagement: 5.1,
            completedDeals: 12,
            averageRating: 4.8,
            averageDealValue: 760
          },
          monthly: [
            { month: 'Jan', earnings: 2400, deals: 3 },
            { month: 'Feb', earnings: 3100, deals: 4 }
          ],
          platforms: [
            { name: 'instagram', followers: 62000 },
            { name: 'youtube', followers: 40000 }
          ],
          engagement: {
            impressions: 450000,
            likes: 32000,
            comments: 2400,
            shares: 1200,
            saves: 900,
            clicks: 1800,
            conversions: 140
          }
        }
      }
    }).as('getCreatorAnalytics');

    cy.visitAsUser('/creator/analytics', { userType: 'creator' });
    cy.wait('@getCreatorAnalytics');

    cy.contains('h1', 'Analytics Dashboard').should('exist');
    cy.contains('Total Earnings').should('exist');
    cy.contains('Performance Over Time').should('exist');

    cy.get('select').first().select('Last 7 Days');
    cy.wait('@getCreatorAnalytics');
  });
});