describe('M8 Notifications Flow', () => {
  beforeEach(() => {
    const notifications = [
      {
        _id: 'notif-1',
        title: 'New Deal Offer',
        message: 'A brand sent you a new offer',
        type: 'deal',
        read: false,
        createdAt: '2031-01-20T00:00:00.000Z'
      },
      {
        _id: 'notif-2',
        title: 'Payment Released',
        message: 'Your payment has been released',
        type: 'payment',
        read: true,
        createdAt: '2031-01-19T00:00:00.000Z'
      }
    ];

    cy.mockAppShell({ notifications });
  });

  it('renders notifications and supports type/unread filtering', () => {
    cy.intercept('GET', '**/api/notifications*', {
      statusCode: 200,
      body: {
        success: true,
        notifications: [
          {
            _id: 'notif-1',
            title: 'New Deal Offer',
            message: 'A brand sent you a new offer',
            type: 'deal',
            read: false,
            createdAt: '2031-01-20T00:00:00.000Z'
          },
          {
            _id: 'notif-2',
            title: 'Payment Released',
            message: 'Your payment has been released',
            type: 'payment',
            read: true,
            createdAt: '2031-01-19T00:00:00.000Z'
          }
        ],
        unreadCount: 1
      }
    }).as('getNotifications');

    cy.visitAsUser('/brand/notifications', { userType: 'brand' });
    cy.wait('@getNotifications');

    cy.contains('h1', 'Notifications').should('be.visible');
    cy.contains('New Deal Offer').should('be.visible');
    cy.contains('Payment Released').should('be.visible');

    cy.contains('button', 'Unread').click();
    cy.contains('New Deal Offer').should('be.visible');

    cy.contains('button', 'payment').click();
    cy.contains('Payment Released').should('be.visible');
  });

  it('marks notifications as read and clears all notifications', () => {
    cy.intercept('GET', '**/api/notifications*', {
      statusCode: 200,
      body: {
        success: true,
        notifications: [
          {
            _id: 'notif-1',
            title: 'New Deal Offer',
            message: 'A brand sent you a new offer',
            type: 'deal',
            read: false,
            createdAt: '2031-01-20T00:00:00.000Z'
          },
          {
            _id: 'notif-2',
            title: 'New Message',
            message: 'You received a new message',
            type: 'message',
            read: false,
            createdAt: '2031-01-19T00:00:00.000Z'
          }
        ],
        unreadCount: 2
      }
    }).as('getNotifications');

    cy.intercept('PUT', '**/api/notifications/notif-1/read*', {
      statusCode: 200,
      body: { success: true }
    }).as('markOneRead');

    cy.intercept('PUT', '**/api/notifications/read-all*', {
      statusCode: 200,
      body: { success: true }
    }).as('markAllRead');

    cy.intercept('DELETE', '**/api/notifications/clear-all*', {
      statusCode: 200,
      body: { success: true }
    }).as('clearAll');

    cy.visitAsUser('/brand/notifications', { userType: 'brand' });
  cy.wait('@getNotifications');

  cy.contains('button', /^Mark as read$/i).click();
    cy.wait('@markOneRead');

    cy.contains('button', 'Mark All as Read').click({ force: true });
    cy.wait('@markAllRead');

    cy.contains('button', 'Clear All Notifications').click();
    cy.wait('@clearAll');
  });
});
