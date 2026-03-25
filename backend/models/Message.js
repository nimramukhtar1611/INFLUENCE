
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Flat sender reference — no nested object with user_id
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  content: {
    type: String,
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
    default: ''
  },

  contentType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'deal_offer', 'deal_accept', 'deal_reject', 'payment'],
    default: 'text'
  },

  attachments: [{
    url:      { type: String, required: true },
    type:     { type: String, enum: ['image', 'video', 'document', 'audio', 'other'] },
    filename: String,
    size:     Number,
    thumbnail: String,
    duration:  Number,
    width:     Number,
    height:    Number,
    mimeType:  String
  }],

  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    index: true
  },

  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },

  // The message being replied to
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reaction: {
      type: String,
      enum: ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉']
    },
    createdAt: { type: Date, default: Date.now }
  }],

  // ==================== READ RECEIPTS ====================
  readBy: [{
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt:  { type: Date, default: Date.now }
  }],

  firstReadAt: Date,
  lastReadAt:  Date,
  readCount:   { type: Number, default: 0 },

  // ==================== DELIVERY TRACKING ====================
  deliveredTo: [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],

  deliveredCount: { type: Number, default: 0 },

  deliveryStatus: {
    type: Map,
    of: { type: String, enum: ['sent', 'delivered', 'read'] },
    default: {}
  },

  // ==================== EDIT / DELETE ====================
  isEdited:  { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true },

  editHistory: [{
    content:  String,
    editedAt: Date
  }],

  metadata: {
    ipAddress: String,
    userAgent: String,
    platform:  String
  }
}, {
  timestamps: true   // adds createdAt + updatedAt automatically
});

// ==================== INDEXES ====================
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ 'readBy.userId': 1 });
messageSchema.index({ 'deliveredTo.userId': 1 });
messageSchema.index({ conversationId: 1, 'readBy.userId': 1, createdAt: -1 });
messageSchema.index({ content: 'text' });
messageSchema.index({ dealId: 1 });

// ==================== PRE-SAVE ====================
messageSchema.pre('save', function (next) {
  this.readCount      = this.readBy?.length      || 0;
  this.deliveredCount = this.deliveredTo?.length  || 0;

  if (this.deliveredTo?.length) {
    this.deliveredTo.forEach(d =>
      this.deliveryStatus.set(d.userId.toString(), 'delivered')
    );
  }

  if (this.readBy?.length) {
    this.readBy.forEach(r =>
      this.deliveryStatus.set(r.userId.toString(), 'read')
    );
    if (!this.firstReadAt) this.firstReadAt = this.readBy[0].readAt;
    this.lastReadAt = this.readBy[this.readBy.length - 1].readAt;
  }

  next();
});

// ==================== INSTANCE METHODS ====================
messageSchema.methods.markAsDelivered = async function (userId) {
  const already = this.deliveredTo.some(d => d.userId.toString() === userId.toString());
  if (!already) {
    this.deliveredTo.push({ userId, deliveredAt: new Date() });
    this.deliveryStatus.set(userId.toString(), 'delivered');
    this.deliveredCount = this.deliveredTo.length;
    await this.save();
  }
  return this;
};

messageSchema.methods.markAsRead = async function (userId) {
  const already = this.readBy.some(r => r.userId.toString() === userId.toString());
  if (!already) {
    const now = new Date();
    this.readBy.push({ userId, readAt: now });
    this.deliveryStatus.set(userId.toString(), 'read');
    this.readCount = this.readBy.length;
    if (!this.firstReadAt) this.firstReadAt = now;
    this.lastReadAt = now;
    await this.save();
  }
  return this;
};

messageSchema.methods.addReaction = async function (userId, reaction) {
  // Remove any existing reaction from this user first
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );
  this.reactions.push({ userId, reaction, createdAt: new Date() });
  await this.save();
  return this;
};

messageSchema.methods.removeReaction = async function (userId) {
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );
  await this.save();
  return this;
};

messageSchema.methods.getReadReceipts = function () {
  return {
    readBy:         this.readBy.map(r => ({ userId: r.userId, readAt: r.readAt })),
    deliveredTo:    this.deliveredTo.map(d => ({ userId: d.userId, deliveredAt: d.deliveredAt })),
    readCount:      this.readCount,
    deliveredCount: this.deliveredCount,
    firstReadAt:    this.firstReadAt,
    lastReadAt:     this.lastReadAt
  };
};

// ==================== STATIC METHODS ====================
messageSchema.statics.markAllAsRead = async function (conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      senderId:          { $ne: userId },
      'readBy.userId':   { $ne: userId }
    },
    {
      $addToSet: { readBy: { userId, readAt: new Date() } }
    }
  );
};

messageSchema.statics.getUnreadCount = async function (conversationId, userId) {
  return this.countDocuments({
    conversationId,
    senderId:        { $ne: userId },
    'readBy.userId': { $ne: userId },
    isDeleted:       false
  });
};

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);