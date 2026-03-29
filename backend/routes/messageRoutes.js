// routes/messageRoutes.js - COMPLETE
const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

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

// Upload attachment - Restrict to images only as requested
router.post('/upload', uploadMultiple('files', { allowedCategories: ['image'] }), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const files = await Promise.all(req.files.map(async (file) => {
      let fileUrl = `/uploads/${file.filename}`;
      let publicId = null;

      // Upload to cloudinary if configured
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'messages',
            resource_type: 'image' // Explicitly set to image
          });
          fileUrl = result.secure_url;
          publicId = result.public_id;
          
          // Delete local file after successful upload to Cloudinary
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cloudinaryError) {
          console.error('Cloudinary upload error:', cloudinaryError);
          // Fallback to local URL if Cloudinary fails
        }
      }

      return {
        url: fileUrl,
        type: 'image', // Since we only allow images now
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        publicId
      };
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