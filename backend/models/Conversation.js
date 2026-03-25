// server/models/Conversation.js
const mongoose = require('mongoose');
const conversationSchema = new mongoose.Schema({
  conversation_id: {
    type: String,
    unique: true,
    required: true
  },
  participants: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user_type: {
      type: String,
      enum: ['brand', 'creator', 'admin', 'agency'],
      required: true
    },
    joined_at: {
      type: Date,
      default: Date.now
    },
    left_at: Date,
    is_active: {
      type: Boolean,
      default: true
    },
    role: {
      type: String,
      enum: ['owner', 'member', 'observer'],
      default: 'member'
    },
    last_read_at: {
      type: Date,
      default: Date.now
    },
    notifications_enabled: {
      type: Boolean,
      default: true
    },
    muted_until: Date,
    nickname: String
  }],
  participant_count: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'deal', 'dispute', 'support'],
    default: 'direct',
    required: true
  },
  deal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  dispute_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute'
  },
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  metadata: {
    title: String,
    description: String,
    avatar: String,
    custom_data: mongoose.Schema.Types.Mixed,
    tags: [String],
    is_pinned: {
      type: Boolean,
      default: false
    },
    is_archived: {
      type: Boolean,
      default: false
    }
  },
  last_message: {
    message_id: mongoose.Schema.Types.ObjectId,
    content: String,
    sender_id: mongoose.Schema.Types.ObjectId,
    sender_name: String,
    created_at: Date,
    type: String
  },
  message_count: {
    type: Number,
    default: 0
  },
  unread_count: {
    type: Map,
    of: Number,
    default: new Map()
  },
  settings: {
    is_read_only: {
      type: Boolean,
      default: false
    },
    allow_replies: {
      type: Boolean,
      default: true
    },
    auto_close_days: Number,
    max_participants: {
      type: Number,
      default: 50
    },
    require_approval: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'closed', 'deleted'],
    default: 'active'
  },
  closed_at: Date,
  closed_by: mongoose.Schema.Types.ObjectId,
  close_reason: String,
  created_by: {
    user_id: mongoose.Schema.Types.ObjectId,
    user_type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Message sub-schema
const messageSchema = new mongoose.Schema({
  message_id: {
    type: String,
    unique: true,
    required: true
  },
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user_type: {
      type: String,
      enum: ['brand', 'creator', 'admin', 'agency'],
      required: true
    },
    name: String,
    avatar: String
  },
  message_type: {
    type: String,
    enum: [
      'text',
      'image',
      'video',
      'file',
      'offer',
      'contract',
      'payment',
      'system',
      'deal_update',
      'notification'
    ],
    default: 'text'
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  formatted_content: {
    html: String,
    markdown: String,
    mentions: [{
      user_id: mongoose.Schema.Types.ObjectId,
      username: String,
      range: [Number, Number]
    }]
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document']
    },
    url: String,
    thumbnail_url: String,
    file_name: String,
    file_size: Number,
    mime_type: String,
    duration: Number, // for video/audio
    dimensions: {
      width: Number,
      height: Number
    }
  }],
  attachments: [{
    type: String,
    url: String,
    name: String
  }],
  reactions: [{
    emoji: String,
    users: [{
      user_id: mongoose.Schema.Types.ObjectId,
      reacted_at: Date
    }],
    count: Number
  }],
  reply_to: {
    message_id: mongoose.Schema.Types.ObjectId,
    content: String,
    sender: String
  },
  metadata: {
    offer_data: mongoose.Schema.Types.Mixed,
    contract_data: mongoose.Schema.Types.Mixed,
    payment_data: mongoose.Schema.Types.Mixed,
    deal_update_data: mongoose.Schema.Types.Mixed,
    system_data: mongoose.Schema.Types.Mixed,
    ip_address: String,
    user_agent: String
  },
  read_by: [{
    user_id: mongoose.Schema.Types.ObjectId,
    read_at: {
      type: Date,
      default: Date.now
    }
  }],
  delivered_to: [{
    user_id: mongoose.Schema.Types.ObjectId,
    delivered_at: Date
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'deleted'],
    default: 'sent'
  },
  is_edited: {
    type: Boolean,
    default: false
  },
  edit_history: [{
    content: String,
    edited_at: Date
  }],
  is_deleted: {
    type: Boolean,
    default: false
  },
  deleted_for: [mongoose.Schema.Types.ObjectId],
  deleted_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hooks
conversationSchema.pre('save', function(next) {
  if (!this.conversation_id) {
    this.conversation_id = `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  this.participant_count = this.participants.length;
  this.updated_at = Date.now();
  next();
});

messageSchema.pre('save', function(next) {
  if (!this.message_id) {
    this.message_id = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  this.updated_at = Date.now();
  next();
});

// Conversation Methods
conversationSchema.methods.addParticipant = function(userId, userType, addedBy) {
  const existing = this.participants.find(p => p.user_id.equals(userId));
  
  if (!existing) {
    this.participants.push({
      user_id: userId,
      user_type: userType,
      joined_at: new Date(),
      is_active: true
    });
    
    this.participant_count = this.participants.length;
    
    // Log system message
    this.addSystemMessage(`${userType} joined the conversation`, addedBy);
  }
  
  return this.save();
};

conversationSchema.methods.removeParticipant = function(userId, removedBy) {
  const participant = this.participants.find(p => p.user_id.equals(userId));
  
  if (participant) {
    participant.is_active = false;
    participant.left_at = new Date();
    
    this.participant_count = this.participants.filter(p => p.is_active).length;
    
    // Log system message
    this.addSystemMessage(`User left the conversation`, removedBy);
  }
  
  return this.save();
};

conversationSchema.methods.updateLastMessage = function(message) {
  this.last_message = {
    message_id: message._id,
    content: message.content.substring(0, 100),
    sender_id: message.sender.user_id,
    sender_name: message.sender.name,
    created_at: message.created_at,
    type: message.message_type
  };
  
  this.message_count += 1;
  
  // Update unread counts for all participants except sender
  this.participants.forEach(p => {
    if (!p.user_id.equals(message.sender.user_id) && p.is_active) {
      const currentCount = this.unread_count.get(p.user_id.toString()) || 0;
      this.unread_count.set(p.user_id.toString(), currentCount + 1);
    }
  });
  
  return this.save();
};

conversationSchema.methods.markAsRead = function(userId) {
  const participant = this.participants.find(p => p.user_id.equals(userId));
  if (participant) {
    participant.last_read_at = new Date();
    this.unread_count.set(userId.toString(), 0);
  }
  return this.save();
};

conversationSchema.methods.getUnreadCount = function(userId) {
  return this.unread_count.get(userId.toString()) || 0;
};

conversationSchema.methods.addSystemMessage = function(content, triggeredBy) {
  const Message = mongoose.model('Message');
  const message = new Message({
    conversation_id: this._id,
    sender: {
      user_id: triggeredBy,
      user_type: 'system'
    },
    message_type: 'system',
    content: content,
    metadata: {
      system_data: {
        type: 'participant_update',
        triggered_by: triggeredBy
      }
    }
  });
  
  return message.save();
};

// Message Methods
messageSchema.methods.markAsRead = function(userId) {
  if (!this.read_by.some(r => r.user_id.equals(userId))) {
    this.read_by.push({
      user_id: userId,
      read_at: new Date()
    });
    
    if (this.read_by.length === this.constructor.getActiveParticipants(this.conversation_id) - 1) {
      this.status = 'read';
    }
  }
  return this.save();
};

messageSchema.methods.markAsDelivered = function(userId) {
  if (!this.delivered_to.some(d => d.user_id.equals(userId))) {
    this.delivered_to.push({
      user_id: userId,
      delivered_at: new Date()
    });
    
    if (this.status === 'sent') {
      this.status = 'delivered';
    }
  }
  return this.save();
};

messageSchema.methods.addReaction = function(userId, emoji) {
  let reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (!reaction) {
    reaction = {
      emoji,
      users: [],
      count: 0
    };
    this.reactions.push(reaction);
  }
  
  if (!reaction.users.some(u => u.user_id.equals(userId))) {
    reaction.users.push({
      user_id: userId,
      reacted_at: new Date()
    });
    reaction.count += 1;
  }
  
  return this.save();
};

messageSchema.methods.removeReaction = function(userId, emoji) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    reaction.users = reaction.users.filter(u => !u.user_id.equals(userId));
    reaction.count = reaction.users.length;
    
    if (reaction.count === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
  }
  
  return this.save();
};

messageSchema.methods.softDelete = function(userId) {
  this.is_deleted = true;
  this.deleted_for.push(userId);
  this.deleted_at = new Date();
  return this.save();
};

// Static methods
conversationSchema.statics.getOrCreateDirect = async function(user1Id, user1Type, user2Id, user2Type) {
  // Check if direct conversation exists
  let conversation = await this.findOne({
    type: 'direct',
    'participants.user_id': { $all: [user1Id, user2Id] },
    'participants.is_active': true
  });
  
  if (!conversation) {
    conversation = new this({
      type: 'direct',
      participants: [
        { user_id: user1Id, user_type: user1Type, role: 'member' },
        { user_id: user2Id, user_type: user2Type, role: 'member' }
      ],
      created_by: { user_id: user1Id, user_type: user1Type }
    });
    
    await conversation.save();
  }
  
  return conversation;
};

conversationSchema.statics.getUserConversations = function(userId) {
  return this.find({
    'participants': {
      $elemMatch: {
        user_id: userId,
        is_active: true
      }
    },
    status: 'active'
  })
  .sort('-last_message.created_at')
  .populate('participants.user_id', 'full_name email profile_image')
  .populate('deal_id')
  .populate('last_message.message_id');
};

// Indexes
conversationSchema.index({ conversation_id: 1 });
conversationSchema.index({ 'participants.user_id': 1 });
conversationSchema.index({ deal_id: 1 });
conversationSchema.index({ dispute_id: 1 });
conversationSchema.index({ status: 1 });
conversationSchema.index({ updated_at: -1 });
conversationSchema.index({ 'last_message.created_at': -1 });

messageSchema.index({ message_id: 1 });
messageSchema.index({ conversation_id: 1, created_at: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'read_by.user_id': 1 });
messageSchema.index({ created_at: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
module.exports = {
  Conversation,
  Message
};