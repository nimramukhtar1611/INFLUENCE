// routes/notificationRoutes.js - COMPLETE MERGED VERSION
//
// Key decisions:
//  • File 2 ka architecture base rakha  → router.use(protect) global middleware
//    + destructured imports, cleaner structure
//  • File 1 se add kiya                 → getPreferences / updatePreferences aliases
//    (getSettings / updateSettings ke saath map hote hain)
//  • File 2 ke extra routes rakhe       → unread-count, type/:type, push/*,
//    test, admin cleanup
//  • ORDERING FIX                       → static routes (/read-all, /clear-all,
//    /unread-count, /settings, /preferences, /cleanup, /test, /type/:type,
//    /push/*) sab dynamic (/:id, /:notificationId) se PEHLE

const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,                    // file 2 export name
  clearAllNotifications,       // file 1 export name (alias — whichever controller exports)
  getSettings,                 // file 2 export name
  updateSettings,              // file 2 export name
  getNotificationSettings,     // file 1 export name (alias)
  updateNotificationSettings,  // file 1 export name (alias)
  getPreferences,              // file 1 — per-type toggles
  updatePreferences,           // file 1 — per-type toggles
  sendTestNotification,
  subscribePush,
  unsubscribePush,
  sendPushNotification,
  getUnreadCount,
  getNotificationsByType,
  cleanupOldNotifications
} = require('../controllers/notificationController');

// ─────────────────────────────────────────────────────────────────────────────
// ALL ROUTES REQUIRE AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────
router.use(protect);

// ── Notifications — list ──────────────────────────────────────────────────
router.get('/',                   getNotifications);
router.get('/unread-count',       getUnreadCount);
router.get('/type/:type',         getNotificationsByType);

// ── Notifications — bulk actions (static BEFORE dynamic /:id) ────────────
router.put(   '/read-all',        markAllAsRead);
router.delete('/clear-all',       clearAll || clearAllNotifications);

// ── Settings ──────────────────────────────────────────────────────────────
// Support both export names: getSettings (file 2) / getNotificationSettings (file 1)
router.get('/settings',           getSettings            || getNotificationSettings);
router.put('/settings',           updateSettings         || updateNotificationSettings);

// ── Preferences (per-type toggles) ───────────────────────────────────────
// Separate endpoints kept for granular per-type control (file 1)
// If controller merges these into settings, these can proxy to same handler
router.get('/preferences',        getPreferences);
router.put('/preferences',        updatePreferences);

// ── Push notifications ────────────────────────────────────────────────────
router.post('/push/subscribe',    subscribePush);
router.post('/push/unsubscribe',  unsubscribePush);

// ── Test ──────────────────────────────────────────────────────────────────
router.post('/test',              sendTestNotification);

// ── Admin only ────────────────────────────────────────────────────────────
router.post(  '/push/send',  authorize('admin'), sendPushNotification);
router.delete('/cleanup',    authorize('admin'), cleanupOldNotifications);

// ── Single notification actions (dynamic — LAST) ──────────────────────────
// Both :id (file 1) and :notificationId (file 2) param names work — Express
// doesn't care about param name, just position
router.put(   '/:notificationId/read', markAsRead);
router.delete('/:notificationId',      deleteNotification);

module.exports = router;