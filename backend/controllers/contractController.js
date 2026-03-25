// controllers/contractController.js - COMPLETE FIXED VERSION WITH ESIGN
const Contract = require('../models/Contract');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ContractService = require('../services/contractService');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

// @desc    Get contract for deal
// @route   GET /api/contracts/deal/:dealId
// @access  Private
const getContractByDeal = asyncHandler(async (req, res) => {
  const contract = await Contract.findOne({ dealId: req.params.dealId })
    .populate('brandId', 'brandName email address')
    .populate('creatorId', 'displayName handle email')
    .populate('campaignId', 'title');

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  // Check authorization
  if (contract.brandId._id.toString() !== req.user._id.toString() && 
      contract.creatorId._id.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json({
    success: true,
    contract
  });
});

// @desc    Get contract by ID
// @route   GET /api/contracts/:id
// @access  Private
const getContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id)
    .populate('brandId', 'brandName email address')
    .populate('creatorId', 'displayName handle email')
    .populate('campaignId', 'title');

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  // Check authorization
  if (contract.brandId._id.toString() !== req.user._id.toString() && 
      contract.creatorId._id.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  res.json({
    success: true,
    contract
  });
});

// @desc    Create contract from deal
// @route   POST /api/contracts/create-from-deal/:dealId
// @access  Private
const createContractFromDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findById(req.params.dealId)
    .populate('brandId')
    .populate('creatorId')
    .populate('campaignId');

  if (!deal) {
    res.status(404);
    throw new Error('Deal not found');
  }

  // Check authorization
  if (deal.brandId._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the brand can create contracts');
  }

  const contract = await ContractService.createContractFromDeal(deal);

  res.status(201).json({
    success: true,
    message: 'Contract created successfully',
    contract
  });
});

// @desc    Update contract
// @route   PUT /api/contracts/:id
// @access  Private
const updateContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  // Only brand can update, and only if not signed
  if (contract.brandId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (contract.status !== 'draft' && contract.status !== 'amendment') {
    res.status(400);
    throw new Error('Cannot update contract after it has been sent');
  }

  const { content, deliverables, paymentTerms, rightsAndOwnership, confidentiality } = req.body;

  if (content) contract.content = content;
  if (deliverables) contract.deliverables = deliverables;
  if (paymentTerms) contract.paymentTerms = { ...contract.paymentTerms, ...paymentTerms };
  if (rightsAndOwnership) contract.rightsAndOwnership = rightsAndOwnership;
  if (confidentiality) contract.confidentiality = confidentiality;

  contract.version += 1;
  await contract.save();

  res.json({
    success: true,
    contract
  });
});

// @desc    Generate contract from template
// @route   POST /api/contracts/generate
// @access  Private
const generateFromTemplate = asyncHandler(async (req, res) => {
  const { campaignId, creatorId, template } = req.body;
  
  // Get campaign
  const Campaign = require('../models/Campaign');
  const campaign = await Campaign.findById(campaignId);
  
  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  // Get creator
  const Creator = require('../models/Creator');
  const creator = await Creator.findById(creatorId);
  
  if (!creator) {
    res.status(404);
    throw new Error('Creator not found');
  }

  // Create deal temporarily for contract generation
  const tempDeal = {
    _id: new mongoose.Types.ObjectId(),
    brandId: req.user._id,
    creatorId,
    campaignId,
    deliverables: campaign.deliverables,
    budget: campaign.budget,
    platformFee: campaign.budget * 0.1,
    netAmount: campaign.budget * 0.9,
    deadline: campaign.endDate,
    createdBy: req.user._id
  };

  const contract = await ContractService.createContractFromDeal(tempDeal);

  res.json({
    success: true,
    message: 'Contract generated successfully',
    contract
  });
});

// @desc    Sign contract
// @route   POST /api/contracts/:id/sign
// @access  Private
const signContractHandler = asyncHandler(async (req, res) => {
  const { signature, userType, method = 'draw' } = req.body;
  
  const contract = await Contract.findById(req.params.id);

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  // Check if user is authorized to sign
  if (userType === 'brand' && contract.brandId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to sign as brand');
  }

  if (userType === 'creator' && contract.creatorId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to sign as creator');
  }

  // Check if already signed
  const alreadySigned = contract.signatures.some(
    s => s.userId.toString() === req.user._id.toString()
  );

  if (alreadySigned) {
    res.status(400);
    throw new Error('You have already signed this contract');
  }

  // Create signature object
  const signatureObj = {
    userId: req.user._id,
    userType,
    signature,
    method,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    signedAt: new Date()
  };

  // Add signature
  contract.signatures.push(signatureObj);

  if (userType === 'brand') {
    contract.signedByBrand = true;
  } else {
    contract.signedByCreator = true;
  }

  // If both signed, update status
  if (contract.signedByBrand && contract.signedByCreator) {
    contract.status = 'signed';
    contract.signedAt = new Date();
    
    // Generate final PDF
    await ContractService.generateContractPDF(contract._id);
    
    // Update deal
    await Deal.findByIdAndUpdate(contract.dealId, {
      contractId: contract._id,
      $push: {
        timeline: {
          event: 'Contract Signed',
          description: 'Contract has been signed by both parties',
          userId: req.user._id
        }
      }
    });

    // Notify both parties
    await Notification.create({
      userId: contract.brandId,
      type: 'deal',
      title: 'Contract Signed',
      message: 'The contract has been signed by both parties',
      data: { contractId: contract._id, dealId: contract.dealId }
    });

    await Notification.create({
      userId: contract.creatorId,
      type: 'deal',
      title: 'Contract Signed',
      message: 'The contract has been signed by both parties',
      data: { contractId: contract._id, dealId: contract.dealId }
    });
  } else {
    contract.status = 'partially_signed';
    
    // Notify the other party
    const notifyUserId = userType === 'brand' ? contract.creatorId : contract.brandId;
    await Notification.create({
      userId: notifyUserId,
      type: 'deal',
      title: 'Contract Signed',
      message: `The ${userType} has signed the contract. Waiting for your signature.`,
      data: { contractId: contract._id, dealId: contract.dealId }
    });
  }

  await contract.save();

  res.json({
    success: true,
    message: 'Contract signed successfully',
    contract
  });
});

// @desc    Send contract for e-signature
// @route   POST /api/contracts/:id/send-for-signature
// @access  Private
const sendForSignature = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id)
    .populate('brandId', 'email fullName')
    .populate('creatorId', 'email displayName');

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  if (contract.brandId._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the brand can send contracts for signature');
  }

  if (contract.status !== 'draft') {
    res.status(400);
    throw new Error('Contract has already been sent');
  }

  contract.status = 'sent';
  contract.sentAt = new Date();
  await contract.save();

  // Generate PDF if not exists
  if (!contract.pdfUrl) {
    await ContractService.generateContractPDF(contract._id);
  }

  // Send email to creator
  const emailService = require('../services/emailService');
  await emailService.sendEmail({
    to: contract.creatorId.email,
    subject: `Contract Ready for Signature - ${contract.contractNumber}`,
    html: `
      <h2>Contract Ready for Signature</h2>
      <p>Hi ${contract.creatorId.displayName},</p>
      <p>${contract.brandId.brandName} has sent you a contract for review and signature.</p>
      <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
      <p><a href="${process.env.FRONTEND_URL}/contracts/${contract._id}/sign">Click here to review and sign the contract</a></p>
    `
  });

  // Send notification
  await Notification.create({
    userId: contract.creatorId._id,
    type: 'deal',
    title: 'Contract Ready for Signature',
    message: `A contract from ${contract.brandId.brandName} is ready for your signature`,
    data: { contractId: contract._id, dealId: contract.dealId }
  });

  res.json({
    success: true,
    message: 'Contract sent for signature',
    contract
  });
});

// @desc    Download contract PDF
// @route   GET /api/contracts/:id/download
// @access  Private
const downloadContract = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id);

  if (!contract) {
    res.status(404);
    throw new Error('Contract not found');
  }

  // Check authorization
  if (contract.brandId.toString() !== req.user._id.toString() && 
      contract.creatorId.toString() !== req.user._id.toString() &&
      req.user.userType !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  // Generate PDF if not exists
  if (!contract.pdfUrl) {
    await ContractService.generateContractPDF(contract._id);
  }

  // Get updated contract with PDF URL
  const updatedContract = await Contract.findById(contract._id);

  res.json({
    success: true,
    url: updatedContract.pdfUrl
  });
});

// @desc    Get user contracts
// @route   GET /api/contracts/user
// @access  Private
const getUserContracts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = {
    $or: [
      { brandId: req.user._id },
      { creatorId: req.user._id }
    ]
  };

  if (status) query.status = status;

  const contracts = await Contract.find(query)
    .populate('brandId', 'brandName')
    .populate('creatorId', 'displayName handle')
    .populate('campaignId', 'title')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Contract.countDocuments(query);

  res.json({
    success: true,
    contracts,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// @desc    Get contract history
// @route   GET /api/contracts/:id/history
// @access  Private
const getContractHistory = asyncHandler(async (req, res) => {
  const history = await ContractService.getContractHistory(req.params.id);

  if (!history) {
    res.status(404);
    throw new Error('Contract not found');
  }

  res.json({
    success: true,
    ...history
  });
});

// @desc    Amend contract
// @route   POST /api/contracts/:id/amend
// @access  Private
const amendContract = asyncHandler(async (req, res) => {
  const { amendments } = req.body;

  const contract = await ContractService.amendContract(req.params.id, {
    ...amendments,
    amendedBy: req.user._id
  });

  res.json({
    success: true,
    message: 'Contract amended successfully',
    contract
  });
});

module.exports = {
  getContractByDeal,
  getContract,
  createContractFromDeal,
  generateFromTemplate,
  updateContract,
  signContractHandler,
  sendForSignature,
  downloadContract,
  getUserContracts,
  getContractHistory,
  amendContract
};