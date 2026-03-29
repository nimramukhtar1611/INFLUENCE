
const express = require('express');
const path = require('path');
const fs = require('fs');

// Mock dependencies
console.log('🔍 Starting route verification...');

try {
  // We need to mock some things because we are running in a restricted environment
  process.env.JWT_SECRET = 'test_secret';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  
  // Mocking the controllers to avoid database connections
  require.cache[require.resolve('./controllers/messageController')] = {
    getConversations: (req, res) => res.json({ success: true }),
    createConversation: (req, res) => res.json({ success: true }),
    getMessages: (req, res) => res.json({ success: true }),
    sendMessage: (req, res) => res.json({ success: true }),
    markAsRead: (req, res) => res.json({ success: true }),
    archiveConversation: (req, res) => res.json({ success: true }),
    unarchiveConversation: (req, res) => res.json({ success: true }),
    muteConversation: (req, res) => res.json({ success: true }),
    unmuteConversation: (req, res) => res.json({ success: true }),
    pinConversation: (req, res) => res.json({ success: true }),
    unpinConversation: (req, res) => res.json({ success: true }),
    updateMessage: (req, res) => res.json({ success: true }),
    deleteMessage: (req, res) => res.json({ success: true }),
    addReaction: (req, res) => res.json({ success: true }),
    removeReaction: (req, res) => res.json({ success: true }),
    searchMessages: (req, res) => res.json({ success: true }),
    getUnreadCount: (req, res) => res.json({ success: true }),
    blockUser: (req, res) => res.json({ success: true }),
    unblockUser: (req, res) => res.json({ success: true }),
    getBlockedUsers: (req, res) => res.json({ success: true }),
  };

  require.cache[require.resolve('./controllers/deliverableController')] = {
    submitDeliverable: (req, res) => res.json({ success: true }),
    getDealDeliverables: (req, res) => res.json({ success: true }),
    getDeliverable: (req, res) => res.json({ success: true }),
    approveDeliverable: (req, res) => res.json({ success: true }),
    requestDeliverableRevision: (req, res) => res.json({ success: true }),
    updateDeliverableMetrics: (req, res) => res.json({ success: true }),
  };

  require.cache[require.resolve('./controllers/disputeController')] = {
    createDispute: (req, res) => res.json({ success: true }),
    uploadEvidence: (req, res) => res.json({ success: true }),
    getDisputes: (req, res) => res.json({ success: true }),
    getUserDisputes: (req, res) => res.json({ success: true }),
    getDispute: (req, res) => res.json({ success: true }),
    addMessage: (req, res) => res.json({ success: true }),
    updateStatus: (req, res) => res.json({ success: true }),
    proposeResolution: (req, res) => res.json({ success: true }),
    acceptResolution: (req, res) => res.json({ success: true }),
    rejectResolution: (req, res) => res.json({ success: true }),
    assignDispute: (req, res) => res.json({ success: true }),
    escalateDispute: (req, res) => res.json({ success: true }),
    getDisputeStats: (req, res) => res.json({ success: true }),
  };

  const messageRoutes = require('./routes/messageRoutes');
  const deliverableRoutes = require('./routes/deliverableRoutes');
  const disputeRoutes = require('./routes/disputeRoutes');
  const uploadRoutes = require('./routes/uploadRoutes');

  console.log('✅ All route files loaded successfully!');
  
  // Check if upload routes are registered
  const checkUploadRoute = (router, pathPrefix = '') => {
    return router.stack.some(layer => {
      if (layer.route) {
        return layer.route.path === '/upload' || layer.route.path === '/:id/evidence' || layer.route.path === '/:dealId';
      }
      return false;
    });
  };

  console.log('Message Upload Route exits?', checkUploadRoute(messageRoutes) ? '✅ YES' : '❌ NO');
  console.log('Deliverable Upload Route exits?', checkUploadRoute(deliverableRoutes) ? '✅ YES' : '❌ NO');
  console.log('Dispute Evidence Route exits?', checkUploadRoute(disputeRoutes) ? '✅ YES' : '❌ NO');

  process.exit(0);
} catch (error) {
  console.error('❌ Verification failed:', error);
  process.exit(1);
}
