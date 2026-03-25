const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  type: {
    type: String,
    enum: ['creators', 'campaigns', 'brands'],
    default: 'creators',
    index: true
  },
  
  filters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  notify: {
    type: Boolean,
    default: false
  },
  
  lastNotified: Date,
  
  notificationCount: {
    type: Number,
    default: 0
  },
  
  resultsCount: {
    type: Number,
    default: 0
  },
  
  lastRun: Date,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
savedSearchSchema.index({ userId: 1, type: 1, createdAt: -1 });
savedSearchSchema.index({ isActive: 1, notify: 1 });

const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);
module.exports = SavedSearch;