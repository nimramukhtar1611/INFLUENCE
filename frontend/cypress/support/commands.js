const baseUsers = {
  brand: {
    _id: 'brand-user-1',
    fullName: 'Brand Owner',
    email: 'brand@example.com',
    userType: 'brand',
    brandName: 'Acme Labs'
  },
  creator: {
    _id: 'creator-user-1',
    fullName: 'Creator One',
    email: 'creator@example.com',
    userType: 'creator',
    displayName: 'CreatorOne',
    handle: '@creatorone'
  },
  admin: {
    _id: 'admin-user-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
    userType: 'admin',
    role: 'admin'
  }
};

const buildUser = (userType, overrides = {}) => ({
  ...(baseUsers[userType] || baseUsers.brand),
  ...overrides
});

Cypress.Commands.add('mockAppShell', (options = {}) => {
  const notifications = options.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // App-wide calls from header/contexts.
  cy.intercept('GET', '**/api/notifications/push/vapid-key*', {
    statusCode: 200,
    body: {
      publicKey: 'BKjzFakePublicKeyForTestsOnly1234567890'
    }
  });

  cy.intercept('POST', '**/api/notifications/push/subscribe*', {
    statusCode: 200,
    body: { success: true }
  });

  cy.intercept('POST', '**/api/notifications/push/unsubscribe*', {
    statusCode: 200,
    body: { success: true }
  });

  cy.intercept('GET', '**/api/notifications/settings*', {
    statusCode: 200,
    body: {
      success: true,
      settings: {
        email: { deals: true, messages: true, payments: true, campaigns: true },
        push: { deals: true, messages: true, payments: true, campaigns: true },
        sms: { deals: false, messages: false, payments: false }
      }
    }
  });

  cy.intercept('GET', '**/api/notifications*', {
    statusCode: 200,
    body: {
      success: true,
      notifications,
      unreadCount,
      totalPages: 1,
      currentPage: 1,
      total: notifications.length
    }
  });

  cy.intercept('GET', '**/api/search/suggestions*', {
    statusCode: 200,
    body: {
      success: true,
      suggestions: options.suggestions || []
    }
  });

  if (!options.skipCampaignMocks) {
    cy.intercept('GET', '**/campaigns/brand*', {
      statusCode: 200,
      body: {
        success: true,
        campaigns: options.brandCampaigns || [],
        counts: options.brandCampaignCounts || { active: 0, draft: 0, completed: 0, paused: 0, pending: 0 },
        pagination: { page: 1, limit: 10, total: (options.brandCampaigns || []).length, pages: 1 }
      }
    });

    cy.intercept('GET', '**/campaigns/available*', {
      statusCode: 200,
      body: {
        success: true,
        campaigns: options.availableCampaigns || [],
        pagination: { page: 1, limit: 10, total: (options.availableCampaigns || []).length, pages: 1 }
      }
    });
  }

  cy.intercept('GET', '**/api/auth/me*', {
    statusCode: 200,
    body: {
      success: true,
      user: options.authUser || baseUsers.brand
    }
  });
});

Cypress.Commands.add('visitAsUser', (path, options = {}) => {
  const userType = options.userType || 'brand';
  const token = options.token || 'test-access-token';
  const refreshToken = options.refreshToken || 'test-refresh-token';
  const user = buildUser(userType, options.user || {});

  cy.intercept('GET', '**/api/auth/me*', {
    statusCode: 200,
    body: {
      success: true,
      user
    }
  }).as('getAuthMe');

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', token);
      win.localStorage.setItem('refreshToken', refreshToken);
      win.localStorage.setItem('user', JSON.stringify(user));
    }
  });
});