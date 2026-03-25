// models/Deliverable.js
const mongoose = require('mongoose');

const deliverableSchema = new mongoose.Schema({
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  type: {
    type: String,
    enum: ['post', 'story', 'reel', 'video', 'blog', 'review', 'image', 'other'],
    required: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'website', 'other'],
    required: true
  },
  description: String,
  quantity: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'submitted', 'approved', 'revision', 'rejected'],
    default: 'pending'
  },
  files: [{
    url: { type: String, required: true },
    thumbnail: String,
    type: { type: String, enum: ['image', 'video', 'pdf', 'other'] },
    size: Number,
    filename: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  links: [{
    url: String,
    platform: String,
    postId: String,
    publishedAt: Date
  }],
  content: String,
  notes: String,
  feedback: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    attachments: [String],
    createdAt: { type: Date, default: Date.now }
  }],
  submittedAt: Date,
  approvedAt: Date,
  revisionRequestedAt: Date,
  revisionNotes: String,
  revisionCount: {
    type: Number,
    default: 0
  },
  metrics: {
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    saves: Number,
    engagement: Number,
    clicks: Number,
    conversions: Number
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Deliverable', deliverableSchema);