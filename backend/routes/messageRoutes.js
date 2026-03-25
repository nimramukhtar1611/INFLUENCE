// routes/messageRoutes.js - COMPLETE
const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  archiveConversation,
  unarchiveConversation,
  muteConversation,
  unmuteConversation,
  pinConversation,
  unpinConversation,
  searchMessages,
  getUnreadCount,
  blockUser,
  unblockUser,
  getBlockedUsers
} = require('../controllers/messageController');

// All routes are protected
router.use(protect);

// Conversations
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:conversationId', getMessages);
router.post('/conversations/:conversationId', sendMessage);
router.put('/conversations/:conversationId/read', markAsRead);
router.put('/conversations/:conversationId/archive', archiveConversation);
router.put('/conversations/:conversationId/unarchive', unarchiveConversation);
router.put('/conversations/:conversationId/mute', muteConversation);
router.put('/conversations/:conversationId/unmute', unmuteConversation);
router.put('/conversations/:conversationId/pin', pinConversation);
router.put('/conversations/:conversationId/unpin', unpinConversation);

// Messages
router.put('/:messageId', updateMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/reactions', addReaction);
router.delete('/:messageId/reactions', removeReaction);

// Search & Stats
router.get('/search', searchMessages);
router.get('/unread', getUnreadCount);

// Blocking
router.post('/block/:userId', blockUser);
router.post('/unblock/:userId', unblockUser);
router.get('/blocked', getBlockedUsers);

// Upload attachment
router.post('/upload', uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const files = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      type: file.mimetype.startsWith('image/') ? 'image' :
            file.mimetype.startsWith('video/') ? 'video' : 'document',
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    }));

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed'
    });
  }
});

module.exports = router;