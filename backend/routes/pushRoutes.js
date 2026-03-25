const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const webPushService = require('../services/webPushService');

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  const publicKey = webPushService.getPublicKey();
  res.json({ 
    success: true, 
    publicKey,
    configured: webPushService.isReady()
  });
});

// Subscribe to push notifications
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subscription is required' 
      });
    }

    const result = await notificationService.addPushSubscription(
      req.user._id,
      subscription
    );

    res.json(result);
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    const result = await notificationService.removePushSubscription(
      req.user._id,
      endpoint
    );

    res.json(result);
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send test notification (admin only)
router.post('/test', protect, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ 
        success: false, 
        error: 'Test mode only available in development' 
      });
    }

    const result = await notificationService.sendPushNotification(
      req.user._id,
      {
        title: 'Test Notification',
        message: 'This is a test push notification from InfluenceX!',
        data: { type: 'test', timestamp: Date.now() }
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;