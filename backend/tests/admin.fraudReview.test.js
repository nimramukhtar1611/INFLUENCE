const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  protect: jest.fn((req, res, next) => next()),
  adminProtect: jest.fn((req, res, next) => {
    req.user = {
      _id: '507f1f77bcf86cd799439012',
      role: 'admin',
      userType: 'admin'
    };
    req.admin = req.user;
    next();
  }),
  superAdminProtect: jest.fn((req, res, next) => next())
}));

jest.mock('../controllers/admin/adminController', () => {
  const ok = jest.fn((req, res) => res.json({ success: true }));
  return {
    adminLogin: ok,
    getDashboardStats: ok,
    getAllDeals: ok,
    getAllPayments: ok,
    getAllUsers: ok,
    getUserDetails: ok,
    updateUserStatus: ok,
    getAllDisputes: ok,
    assignDispute: ok,
    resolveDispute: ok,
    getPendingWithdrawals: ok,
    approveWithdrawal: ok,
    getPlatformAnalytics: ok,
    updateSettings: ok,
    getActivityLog: ok,
    adminGenerate2FA: ok,
    adminVerify2FA: ok,
    adminDisable2FA: ok,
    adminRegenerateBackupCodes: ok,
    adminGet2FAStatus: ok
  };
});

jest.mock('../routes/adminCampaignRoutes', () => {
  const router = require('express').Router();
  router.get('/', (req, res) => res.json({ success: true }));
  return router;
});

jest.mock('../routes/userRoutes', () => {
  const router = require('express').Router();
  router.get('/', (req, res) => res.json({ success: true }));
  return router;
});

jest.mock('../routes/reportRoutes', () => {
  const router = require('express').Router();
  router.get('/', (req, res) => res.json({ success: true }));
  return router;
});

jest.mock('../models/Creator', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

const adminRoutes = require('../routes/adminRoutes');
const Creator = require('../models/Creator');

describe('Admin Fraud Review Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
    jest.clearAllMocks();
  });

  test('GET /api/admin/fraud/review-queue returns paginated queue data', async () => {
    const creators = [
      {
        _id: '507f1f77bcf86cd799439021',
        displayName: 'Creator Queue One',
        fraudDetection: {
          riskScore: 81,
          riskLevel: 'high',
          manualReviewRequired: true
        }
      }
    ];

    const queryChain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(creators)
    };

    Creator.countDocuments.mockResolvedValue(1);
    Creator.find.mockReturnValue(queryChain);

    const response = await request(app)
      .get('/api/admin/fraud/review-queue')
      .query({ page: 1, limit: 20, queue: 'manual_review' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.queue).toBe('manual_review');
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      pages: 1
    });
    expect(response.body.creators).toHaveLength(1);
    expect(Creator.countDocuments).toHaveBeenCalledWith({
      'fraudDetection.manualReviewRequired': true
    });
    expect(Creator.find).toHaveBeenCalledWith({
      'fraudDetection.manualReviewRequired': true
    });
  });

  test('GET /api/admin/fraud/creators/:creatorId returns creator details', async () => {
    const creator = {
      _id: '507f1f77bcf86cd799439022',
      displayName: 'Creator Detail One',
      handle: '@detailone',
      fraudDetection: {
        riskScore: 42,
        riskLevel: 'medium'
      }
    };

    Creator.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(creator)
    });

    const response = await request(app)
      .get('/api/admin/fraud/creators/507f1f77bcf86cd799439022');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.creator).toMatchObject({
      _id: '507f1f77bcf86cd799439022',
      displayName: 'Creator Detail One'
    });
    expect(Creator.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439022');
  });

  test('PATCH /api/admin/fraud/creators/:creatorId/review clears hold', async () => {
    const updatedCreator = {
      _id: '507f1f77bcf86cd799439023',
      displayName: 'Creator Reviewed',
      fraudDetection: {
        manualReviewRequired: false,
        reviewNotes: 'Reviewed and cleared'
      }
    };

    Creator.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(updatedCreator)
    });

    const response = await request(app)
      .patch('/api/admin/fraud/creators/507f1f77bcf86cd799439023/review')
      .send({ action: 'clear_hold', notes: 'Reviewed and cleared' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Fraud hold cleared');

    expect(Creator.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439023',
      {
        $set: {
          'fraudDetection.manualReviewRequired': false,
          'fraudDetection.reviewedAt': expect.any(Date),
          'fraudDetection.reviewedBy': '507f1f77bcf86cd799439012',
          'fraudDetection.reviewNotes': 'Reviewed and cleared'
        }
      },
      { new: true }
    );
  });

  test('PATCH /api/admin/fraud/creators/:creatorId/review marks manual review', async () => {
    const updatedCreator = {
      _id: '507f1f77bcf86cd799439024',
      displayName: 'Creator Re-flagged',
      fraudDetection: {
        manualReviewRequired: true,
        reviewNotes: 'Needs deeper investigation'
      }
    };

    Creator.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(updatedCreator)
    });

    const response = await request(app)
      .patch('/api/admin/fraud/creators/507f1f77bcf86cd799439024/review')
      .send({ action: 'mark_manual_review', notes: 'Needs deeper investigation' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Creator marked for manual review');

    expect(Creator.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439024',
      {
        $set: {
          'fraudDetection.manualReviewRequired': true,
          'fraudDetection.holdAppliedAt': expect.any(Date),
          'fraudDetection.reviewedAt': null,
          'fraudDetection.reviewedBy': null,
          'fraudDetection.reviewNotes': 'Needs deeper investigation'
        }
      },
      { new: true }
    );
  });

  test('PATCH /api/admin/fraud/creators/:creatorId/review rejects invalid action', async () => {
    const response = await request(app)
      .patch('/api/admin/fraud/creators/507f1f77bcf86cd799439025/review')
      .send({ action: 'invalid_action' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid action');
    expect(Creator.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});