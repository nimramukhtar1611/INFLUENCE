// controllers/messageController.js - FULL FIXED VERSION
// All field names now match models/Message.js (camelCase).
// Removed all snake_case field references (conversation_id, sender.user_id, read_by, etc.)
const Message      = require('../models/Message');
const { Conversation }= require('../models/Conversation');
const User         = require('../models/User');
const { getIO }    = require('../socket/chatSocket');
const notificationService = require('../services/notificationService');
const asyncHandler = require('express-async-handler');

// ─── socket helpers ───────────────────────────────────────────────────────────
const emitToConversation = (conversationId, event, data) => {
  const io = getIO();
  if (io) io.to(`conversation_${conversationId}`).emit(event, data);
};

// ==================== GET CONVERSATIONS ====================
// @route GET /api/messages/conversations
const getConversations = asyncHandler(async (req, res) => {
  const { includeArchived = false } = req.query;

  // Conversation model uses its own schema — keep its field names.
  // We only fixed Message field names here, not Conversation schema.
  const query = {
    participants: {
      $elemMatch: {
        user_id:   req.user._id,   // Conversation schema uses snake_case participants
        is_active: true
      }
    },
    status: 'active'
  };

  const conversations = await Conversation.find(query)
    .populate('participants.user_id', 'fullName email userType profilePicture brandName')
    .populate('deal_id',     'title budget status campaignId')
    .populate('campaign_id', 'title')
    .sort({ 'last_message.created_at': -1 });

  const userId = req.user._id.toString();

  const result = conversations
    .filter(conv => {
      if (includeArchived === 'true') return true;
      return !conv.metadata?.is_archived;
    })
    .map(conv => ({
      ...conv.toObject(),
      unreadCount: conv.unread_count?.get(userId) || 0
    }));

  res.json({ success: true, data: result });
});

// ==================== CREATE / GET CONVERSATION ====================
// @route POST /api/messages/conversations
const createConversation = asyncHandler(async (req, res) => {
  const { participantId, dealId, campaignId, initialMessage } = req.body;

  if (!participantId) {
    res.status(400);
    throw new Error('participantId is required');
  }

  const participant = await User.findById(participantId);
  if (!participant) {
    res.status(404);
    throw new Error('Participant not found');
  }

  if (participant.blockedUsers?.some(id => id.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error('You cannot message this user');
  }

  const conversation = await Conversation.getOrCreateDirect(
    req.user._id,
    req.user.userType,
    participantId,
    participant.userType
  );

  if (dealId && !conversation.deal_id) {
    conversation.deal_id    = dealId;
    conversation.campaign_id = campaignId;
    conversation.type        = 'deal';
    await conversation.save();
  }

  if (initialMessage) {
    const message = new Message({
      conversationId: conversation._id,
      senderId:       req.user._id,
      content:        initialMessage,
      contentType:    'text'
    });
    await message.save();
    await conversation.updateLastMessage(message);
  }

  await conversation.populate('participants.user_id', 'fullName email userType profilePicture brandName');
  await conversation.populate('deal_id', 'title budget status');

  res.status(201).json({ success: true, data: conversation });
});

// ==================== GET MESSAGES ====================
// @route GET /api/messages/conversations/:conversationId
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50, before } = req.query;

  // Verify the user is a participant (Conversation schema — snake_case)
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });

  if (!conversation) {
    res.status(403);
    throw new Error('Access denied');
  }

  // FIX: use camelCase Message fields
  const query = { conversationId, isDeleted: false };
  if (before) query.createdAt = { $lt: new Date(before) };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [messages, total] = await Promise.all([
    Message.find(query)
      .populate('senderId', 'fullName email userType profilePicture brandName')
      .populate('replyTo')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Message.countDocuments(query)
  ]);

  // Mark as delivered (non-blocking) — camelCase fields
  Message.updateMany(
    {
      conversationId,
      senderId:              { $ne: req.user._id },
      'deliveredTo.userId':  { $ne: req.user._id }
    },
    {
      $addToSet: { deliveredTo: { userId: req.user._id, deliveredAt: new Date() } }
    }
  ).catch(err => console.error('Delivery update error:', err));

  res.json({
    success: true,
    data: {
      messages: messages.reverse(),   // chronological order
      pagination: {
        page:    parseInt(page),
        limit:   parseInt(limit),
        total,
        pages:   Math.ceil(total / limit),
        hasMore: skip + messages.length < total
      }
    }
  });
});

// ==================== SEND MESSAGE ====================
// @route POST /api/messages/conversations/:conversationId
const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content, attachments = [], dealId, replyTo, contentType = 'text' } = req.body;

  if (!content && attachments.length === 0) {
    res.status(400);
    throw new Error('Message content or attachments required');
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });

  if (!conversation) {
    res.status(403);
    throw new Error('Access denied');
  }

  // FIX: use camelCase Message fields
  const message = new Message({
    conversationId,
    senderId:    req.user._id,
    content,
    contentType,
    attachments,
    replyTo:     replyTo || undefined,
    dealId:      dealId  || undefined,
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    // Sender auto-marked as read + delivered
    readBy:      [{ userId: req.user._id, readAt: new Date() }],
    deliveredTo: [{ userId: req.user._id, deliveredAt: new Date() }]
  });

  await message.save();
  await conversation.updateLastMessage(message);

  await message.populate('senderId', 'fullName email userType profilePicture brandName');
  if (replyTo) await message.populate('replyTo');

  emitToConversation(conversationId, 'new_message', { conversationId, message });

  // Push notifications for other participants
  const otherParticipants = conversation.participants.filter(
    p => p.user_id.toString() !== req.user._id.toString() && p.is_active
  );

  for (const participant of otherParticipants) {
    try {
      await notificationService.sendMessageNotification(
        participant.user_id,
        message,
        req.user
      );
    } catch (err) {
      console.error('Notification error:', err.message);
    }
  }

  res.status(201).json({ success: true, data: message });
});

// ==================== MARK AS READ ====================
// @route PUT /api/messages/conversations/:conversationId/read
const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { messageIds } = req.body;

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    res.status(400);
    throw new Error('messageIds array is required');
  }

  // FIX: camelCase readBy
  await Message.updateMany(
    {
      _id:             { $in: messageIds },
      conversationId,
      'readBy.userId': { $ne: req.user._id }
    },
    {
      $addToSet: { readBy: { userId: req.user._id, readAt: new Date() } }
    }
  );

  // Reset unread count in Conversation (Conversation model uses snake_case Map)
  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { [`unread_count.${req.user._id.toString()}`]: 0 } }
  );

  emitToConversation(conversationId, 'messages_read', {
    messageIds,
    userId: req.user._id,
    conversationId,
    readAt: new Date()
  });

  res.json({ success: true, data: { read: true } });
});

// ==================== UPDATE MESSAGE ====================
// @route PUT /api/messages/:messageId
const updateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content) {
    res.status(400);
    throw new Error('Content is required');
  }

  const message = await Message.findById(messageId);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  // FIX: senderId (not sender.user_id)
  if (message.senderId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // FIX: editHistory (not edit_history), isEdited (not is_edited)
  message.editHistory.push({ content: message.content, editedAt: new Date() });
  message.content  = content;
  message.isEdited = true;
  await message.save();

  emitToConversation(message.conversationId, 'message_edited', {
    messageId,
    content,
    conversationId: message.conversationId,
    editedAt: new Date()
  });

  res.json({ success: true, data: message });
});

// ==================== DELETE MESSAGE ====================
// @route DELETE /api/messages/:messageId
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  // FIX: senderId (not sender.user_id)
  if (message.senderId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  // FIX: isDeleted (not is_deleted)
  message.isDeleted   = true;
  message.content     = 'This message has been deleted';
  message.attachments = [];
  await message.save();

  emitToConversation(message.conversationId, 'message_deleted', {
    messageId,
    conversationId: message.conversationId
  });

  res.json({ success: true, message: 'Message deleted successfully' });
});

// ==================== ADD REACTION ====================
// @route POST /api/messages/:messageId/reactions
const addReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { reaction } = req.body;

  if (!reaction) { res.status(400); throw new Error('Reaction emoji is required'); }

  const message = await Message.findById(messageId);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  await message.addReaction(req.user._id, reaction);

  emitToConversation(message.conversationId, 'message_reaction', {
    messageId,
    userId:         req.user._id,
    reaction,
    conversationId: message.conversationId
  });

  res.json({ success: true, data: message.reactions });
});

// ==================== REMOVE REACTION ====================
// @route DELETE /api/messages/:messageId/reactions
const removeReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) { res.status(404); throw new Error('Message not found'); }

  await message.removeReaction(req.user._id);

  res.json({ success: true, message: 'Reaction removed' });
});

// ==================== CONVERSATION ACTIONS ====================
// @route PUT /api/messages/conversations/:conversationId/archive
const archiveConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });
  if (!conv) { res.status(404); throw new Error('Conversation not found'); }

  if (!conv.metadata) conv.metadata = {};
  conv.metadata.is_archived = true;
  await conv.save();

  res.json({ success: true, message: 'Conversation archived' });
});

const unarchiveConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });
  if (!conv) { res.status(404); throw new Error('Conversation not found'); }

  if (!conv.metadata) conv.metadata = {};
  conv.metadata.is_archived = false;
  await conv.save();

  res.json({ success: true, message: 'Conversation unarchived' });
});

const muteConversation = asyncHandler(async (req, res) => {
  const { duration } = req.body;
  const conv = await Conversation.findOne({
    _id: req.params.conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });
  if (!conv) { res.status(404); throw new Error('Conversation not found'); }

  const participant = conv.participants.find(
    p => p.user_id.toString() === req.user._id.toString()
  );
  if (participant) {
    participant.muted_until           = duration
      ? new Date(Date.now() + duration)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    participant.notifications_enabled = false;
    await conv.save();
  }

  res.json({ success: true, message: 'Conversation muted', mutedUntil: participant?.muted_until });
});

const unmuteConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });
  if (!conv) { res.status(404); throw new Error('Conversation not found'); }

  const participant = conv.participants.find(
    p => p.user_id.toString() === req.user._id.toString()
  );
  if (participant) {
    participant.muted_until           = undefined;
    participant.notifications_enabled = true;
    await conv.save();
  }

  res.json({ success: true, message: 'Conversation unmuted' });
});

const pinConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });
  if (!conv) { res.status(404); throw new Error('Conversation not found'); }

  if (!conv.metadata) conv.metadata = {};
  conv.metadata.is_pinned = true;
  await conv.save();

  res.json({ success: true, message: 'Conversation pinned' });
});

const unpinConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({
    _id: req.params.conversationId,
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });
  if (!conv) { res.status(404); throw new Error('Conversation not found'); }

  if (!conv.metadata) conv.metadata = {};
  conv.metadata.is_pinned = false;
  await conv.save();

  res.json({ success: true, message: 'Conversation unpinned' });
});

// ==================== SEARCH ====================
// @route GET /api/messages/search
const searchMessages = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  if (!q) return res.json({ success: true, data: [] });

  // Get all conversations the user belongs to
  const conversations = await Conversation.find({
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  }).select('_id');

  const conversationIds = conversations.map(c => c._id);

  // FIX: camelCase field names
  const [messages, total] = await Promise.all([
    Message.find({
      conversationId: { $in: conversationIds },
      content:        { $regex: q, $options: 'i' },
      isDeleted:      false
    })
      .populate('senderId', 'fullName email userType profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    Message.countDocuments({
      conversationId: { $in: conversationIds },
      content:        { $regex: q, $options: 'i' },
      isDeleted:      false
    })
  ]);

  res.json({
    success: true,
    data: messages,
    pagination: {
      page:  parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// ==================== UNREAD COUNT ====================
// @route GET /api/messages/unread
const getUnreadCount = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: { $elemMatch: { user_id: req.user._id, is_active: true } }
  });

  let totalUnread = 0;
  conversations.forEach(conv => {
    totalUnread += conv.unread_count?.get(req.user._id.toString()) || 0;
  });

  res.json({ success: true, data: { totalUnread } });
});

// ==================== BLOCK / UNBLOCK ====================
// @route POST /api/messages/block/:userId
const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) { res.status(404); throw new Error('User not found'); }

  await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: userId } });

  // Archive shared conversations
  const conversations = await Conversation.find({
    participants: {
      $all: [
        { $elemMatch: { user_id: req.user._id } },
        { $elemMatch: { user_id: userId } }
      ]
    }
  });

  for (const conv of conversations) {
    if (!conv.metadata) conv.metadata = {};
    conv.metadata.is_archived = true;
    await conv.save();
  }

  res.json({ success: true, message: 'User blocked' });
});

const unblockUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.userId } });
  res.json({ success: true, message: 'User unblocked' });
});

const getBlockedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('blockedUsers', 'fullName email userType profilePicture');
  res.json({ success: true, data: user.blockedUsers || [] });
});

module.exports = {
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
};