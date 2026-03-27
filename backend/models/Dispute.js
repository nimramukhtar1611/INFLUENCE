// server/models/Dispute.js
const mongoose = require('mongoose');

const generateDisputeId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const suffix = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  return `DSP-${year}${month}-${suffix}`;
};

const disputeSchema = new mongoose.Schema({
  dispute_id: {
    type: String,
    unique: true,
    required: true,
    default: generateDisputeId
  },
  deal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: [true, 'Deal ID is required']
  },
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  raised_by: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user_type: {
      type: String,
      enum: ['brand', 'creator'],
      required: true
    }
  },
  raised_against: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user_type: {
      type: String,
      enum: ['brand', 'creator'],
      required: true
    }
  },
  dispute_type: {
    type: String,
    enum: [
      'payment',
      'delivery',
      'quality',
      'communication',
      'contract_breach',
      'intellectual_property',
      'other'
    ],
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  evidence: [{
    file_name: String,
    file_url: {
      type: String,
      required: true
    },
    file_type: String,
    uploaded_by: {
      user_id: mongoose.Schema.Types.ObjectId,
      user_type: String
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    action: {
      type: String,
      enum: ['created', 'evidence_added', 'admin_assigned', 'investigating', 'resolved', 'appealed']
    },
    description: String,
    performed_by: {
      user_id: mongoose.Schema.Types.ObjectId,
      user_type: {
        type: String,
        enum: ['brand', 'creator', 'admin']
      }
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [{
    sender_id: mongoose.Schema.Types.ObjectId,
    sender_type: {
      type: String,
      enum: ['brand', 'creator', 'admin']
    },
    message: String,
    attachments: [String],
    read_by: [{
      user_id: mongoose.Schema.Types.ObjectId,
      read_at: Date
    }],
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  assigned_admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: [
      'open',
      'investigating',
      'pending_response',
      'resolved',
      'closed',
      'appealed'
    ],
    default: 'open'
  },
  resolution: {
    type: {
      type: String,
      enum: [
        'refund_brand',
        'release_payment',
        'split_funds',
        'cancel_contract',
        'no_action'
      ]
    },
    details: String,
    amount: {
      refund_to_brand: Number,
      pay_to_creator: Number,
      platform_fee_forfeited: Number
    },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolved_at: Date,
    notes: String
  },
  appeal: {
    requested_by: mongoose.Schema.Types.ObjectId,
    reason: String,
    evidence: [String],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    requested_at: Date,
    resolved_at: Date
  },
  meta_data: {
    dispute_amount: Number,
    contract_signed_date: Date,
    delivery_deadline: Date,
    actual_delivery_date: Date,
    payment_released: Boolean
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

// Safety net for legacy records or edge paths where default was not applied
disputeSchema.pre('validate', function(next) {
  if (!this.dispute_id) {
    this.dispute_id = generateDisputeId();
  }
  next();
});

disputeSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Add to timeline
disputeSchema.methods.addToTimeline = function(action, description, performedBy) {
  this.timeline.push({
    action,
    description,
    performed_by: performedBy,
    timestamp: new Date()
  });
  return this.save();
};

// Add evidence
disputeSchema.methods.addEvidence = function(fileData, uploadedBy) {
  this.evidence.push({
    ...fileData,
    uploaded_by: uploadedBy,
    uploaded_at: new Date()
  });
  
  this.addToTimeline(
    'evidence_added',
    `New evidence uploaded: ${fileData.file_name}`,
    uploadedBy
  );
  
  return this.save();
};

// Assign admin
disputeSchema.methods.assignAdmin = function(adminId) {
  this.assigned_admin = adminId;
  this.status = 'investigating';
  
  this.addToTimeline(
    'admin_assigned',
    `Admin assigned to dispute`,
    { user_id: adminId, user_type: 'admin' }
  );
  
  return this.save();
};

// Resolve dispute
disputeSchema.methods.resolve = function(resolutionData, adminId) {
  this.status = 'resolved';
  this.resolution = {
    ...resolutionData,
    resolved_by: adminId,
    resolved_at: new Date()
  };
  
  this.addToTimeline(
    'resolved',
    `Dispute resolved: ${resolutionData.type}`,
    { user_id: adminId, user_type: 'admin' }
  );
  
  return this.save();
};

// Get open disputes
disputeSchema.statics.getOpenDisputes = function() {
  return this.find({ status: { $in: ['open', 'investigating', 'pending_response'] } })
    .populate('deal_id')
    .populate('raised_by.user_id', 'email full_name')
    .populate('raised_against.user_id', 'email full_name')
    .sort('-priority -created_at');
};

// Indexes
disputeSchema.index({ dispute_id: 1 });
disputeSchema.index({ deal_id: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ priority: 1 });
disputeSchema.index({ assigned_admin: 1 });
disputeSchema.index({ created_at: -1 });
disputeSchema.index({ 'raised_by.user_id': 1 });
disputeSchema.index({ 'raised_against.user_id': 1 });

const Dispute = mongoose.model('Dispute', disputeSchema);
module.exports = Dispute;