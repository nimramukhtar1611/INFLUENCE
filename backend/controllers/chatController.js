// server/controllers/chatController.js
const { Conversation, Message } = require('../models/Conversation');
const User = require('../models/User');
const Deal = require('../models/Deal');
const { validationResult } = require('express-validator');

// @desc    Get User Conversations
// @route   GET /api/chat/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.getUserConversations(req.user.id);

    // Get unread counts
    const conversationsWithUnread = conversations.map(conv => {
      const unreadCount = conv.getUnreadCount(req.user.id);
      return {
        ...conv.toObject(),
        unread_count: unreadCount
      };
    });

    // Paginate
    const start = (page - 1) * limit;
    const paginated = conversationsWithUnread.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: {
        conversations: paginated,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(conversations.length / limit),
          total_conversations: conversations.length
        }
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get Single Conversation
// @route   GET /api/chat/conversations/:conversationId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants.user_id', 'full_name email profile_image user_type')
      .populate('deal_id')
      .populate('dispute_id');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      p => p.user_id._id.toString() === req.user.id && p.is_active
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }

    // Mark as read
    await conversation.markAsRead(req.user.id);

    res.json({
      success: true,
      data: conversation
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get Conversation Messages
// @route   GET /api/chat/conversations/:conversationId/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { 
      page = 1, 
      limit = 50,
      before,
      after,
      message_type 
    } = req.query;

    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.some(
      p => p.user_id.toString() === req.user.id && p.is_active
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these messages'
      });
    }

    const query = { conversation_id: conversationId };

    if (message_type) {
      query.message_type = message_type;
    }

    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    if (after) {
      query.created_at = { $gt: new Date(after) };
    }

    const messages = await Message.find(query)
      .sort('-created_at')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender.user_id', 'full_name email profile_image');

    const total = await Message.countDocuments(query);

    // Mark messages as delivered
    await Message.updateMany(
      {
        conversation_id: conversationId,
        'sender.user_id': { $ne: req.user.id },
        'delivered_to.user_id': { $ne: req.user.id }
      },
      {
        $push: {
          delivered_to: {
            user_id: req.user.id,
            delivered_at: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_messages: total,
          has_more: page * limit < total
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Send Message
// @route   POST /api/chat/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      conversation_id,
      recipient_id,
      content,
      message_type = 'text',
      media,
      reply_to,
      metadata
    } = req.body;

    let conversation;

    // If conversation_id provided, use existing conversation
    if (conversation_id) {
      conversation = await Conversation.findById(conversation_id);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Check if user is participant
      const isParticipant = conversation.participants.some(
        p => p.user_id.toString() === req.user.id && p.is_active
      );

      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to send messages in this conversation'
        });
      }
    } 
    // Otherwise create new direct conversation
    else if (recipient_id) {
      conversation = await Conversation.getOrCreateDirect(
        req.user.id,
        req.user.user_type,
        recipient_id,
        req.body.recipient_type
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either conversation_id or recipient_id is required'
      });
    }

    // Get sender info
    const sender = await User.findById(req.user.id).select('full_name email profile_image');

    // Create message
    const message = new Message({
      conversation_id: conversation._id,
      sender: {
        user_id: req.user.id,
        user_type: req.user.user_type,
        name: sender.full_name,
        avatar: sender.profile_image
      },
      message_type,
      content,
      media,
      reply_to,
      metadata: {
        ...metadata,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    });

    await message.save();

    // Update conversation
    await conversation.updateLastMessage(message);

    // Emit socket event for real-time delivery
    const io = req.app.get('io');
    conversation.participants.forEach(participant => {
      if (participant.user_id.toString() !== req.user.id && participant.is_active) {
        io.to(`user_${participant.user_id}`).emit('new_message', {
          conversation_id: conversation._id,
          message
        });
      }
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark Message as Read
// @route   PUT /api/chat/messages/:messageId/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.markAsRead(req.user.id);

    // Update conversation unread count
    const conversation = await Conversation.findById(message.conversation_id);
    await conversation.markAsRead(req.user.id);

    // Emit read receipt
    const io = req.app.get('io');
    io.to(`conversation_${message.conversation_id}`).emit('message_read', {
      message_id: messageId,
      user_id: req.user.id,
      read_at: new Date()
    });

    res.json({
      success: true,
      message: 'Marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add Reaction to Message
// @route   POST /api/chat/messages/:messageId/reactions
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.addReaction(req.user.id, emoji);

    // Emit reaction update
    const io = req.app.get('io');
    io.to(`conversation_${message.conversation_id}`).emit('reaction_added', {
      message_id: messageId,
      user_id: req.user.id,
      emoji
    });

    res.json({
      success: true,
      message: 'Reaction added',
      data: message.reactions
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove Reaction
// @route   DELETE /api/chat/messages/:messageId/reactions/:emoji
// @access  Private
exports.removeReaction = async (req, res) => {
  try {
    const { messageId, emoji } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.removeReaction(req.user.id, emoji);

    // Emit reaction update
    const io = req.app.get('io');
    io.to(`conversation_${message.conversation_id}`).emit('reaction_removed', {
      message_id: messageId,
      user_id: req.user.id,
      emoji
    });

    res.json({
      success: true,
      message: 'Reaction removed'
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete Message
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { delete_for_everyone = false } = req.query;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is sender
    if (message.sender.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only delete your own messages'
      });
    }

    if (delete_for_everyone) {
      // Check if within time limit (e.g., 1 hour)
      const timeSinceSent = Date.now() - message.created_at;
      const oneHour = 60 * 60 * 1000;

      if (timeSinceSent > oneHour) {
        return res.status(400).json({
          success: false,
          message: 'Can only delete messages for everyone within 1 hour'
        });
      }

      await message.deleteOne();
    } else {
      await message.softDelete(req.user.id);
    }

    // Emit deletion event
    const io = req.app.get('io');
    io.to(`conversation_${message.conversation_id}`).emit('message_deleted', {
      message_id: messageId,
      delete_for_everyone
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create Group Conversation
// @route   POST /api/chat/conversations/group
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { participant_ids, title, deal_id } = req.body;

    // Validate participants
    const participants = [{
      user_id: req.user.id,
      user_type: req.user.user_type,
      role: 'owner'
    }];

    // Add other participants
    for (const id of participant_ids) {
      const user = await User.findById(id);
      if (user) {
        participants.push({
          user_id: id,
          user_type: user.user_type,
          role: 'member'
        });
      }
    }

    const conversation = new Conversation({
      type: 'group',
      participants,
      metadata: {
        title: title || 'Group Conversation'
      },
      deal_id,
      created_by: {
        user_id: req.user.id,
        user_type: req.user.user_type
      }
    });

    await conversation.save();

    // Add system message
    await conversation.addSystemMessage(
      'Group created',
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: conversation
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add Participant to Group
// @route   POST /api/chat/conversations/:conversationId/participants
// @access  Private
exports.addParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { user_id, user_type } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is owner
    const isOwner = conversation.participants.some(
      p => p.user_id.toString() === req.user.id && p.role === 'owner'
    );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can add participants'
      });
    }

    await conversation.addParticipant(user_id, user_type, req.user.id);

    res.json({
      success: true,
      message: 'Participant added successfully',
      data: conversation
    });

  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove Participant from Group
// @route   DELETE /api/chat/conversations/:conversationId/participants/:userId
// @access  Private
exports.removeParticipant = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is owner
    const isOwner = conversation.participants.some(
      p => p.user_id.toString() === req.user.id && p.role === 'owner'
    );

    if (!isOwner && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove participants'
      });
    }

    await conversation.removeParticipant(userId, req.user.id);

    res.json({
      success: true,
      message: 'Participant removed successfully'
    });

  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Search Messages
// @route   GET /api/chat/search
// @access  Private
exports.searchMessages = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    // Get user's conversations
    const conversations = await Conversation.find({
      'participants': {
        $elemMatch: {
          user_id: req.user.id,
          is_active: true
        }
      }
    }).select('_id');

    const conversationIds = conversations.map(c => c._id);

    // Search messages
    const messages = await Message.find({
      conversation_id: { $in: conversationIds },
      $text: { $search: q },
      is_deleted: false
    })
      .sort('-created_at')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('conversation_id')
      .populate('sender.user_id', 'full_name email profile_image');

    const total = await Message.countDocuments({
      conversation_id: { $in: conversationIds },
      $text: { $search: q },
      is_deleted: false
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_results: total
        }
      }
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get Unread Count
// @route   GET /api/chat/unread
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const conversations = await Conversation.getUserConversations(req.user.id);
    
    const totalUnread = conversations.reduce(
      (sum, conv) => sum + conv.getUnreadCount(req.user.id), 
      0
    );

    res.json({
      success: true,
      data: {
        total_unread: totalUnread,
        conversations: conversations.map(conv => ({
          conversation_id: conv._id,
          unread_count: conv.getUnreadCount(req.user.id)
        }))
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = exports;