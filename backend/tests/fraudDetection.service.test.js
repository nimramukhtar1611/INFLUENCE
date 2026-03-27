const fraudDetectionService = require('../services/fraudDetectionService');

describe('AI Fraud Detection Service', () => {
  test('returns low risk for healthy profile metrics', async () => {
    const creator = {
      socialMedia: {
        instagram: {
          followers: 45000,
          following: 600,
          engagement: 2.9,
          source: 'oauth',
          verified: true
        }
      },
      fraudDetection: {
        history: []
      }
    };

    const result = await fraudDetectionService.evaluateCreator(creator, {
      now: new Date('2026-03-27T10:00:00.000Z'),
      minFollowersForScoring: 1000
    });

    expect(result.riskLevel).toBe('low');
    expect(result.score).toBeLessThan(35);
    expect(result.signals.length).toBe(0);
  });

  test('flags low engagement and follow-ratio anomalies', async () => {
    const creator = {
      socialMedia: {
        instagram: {
          followers: 120000,
          following: 290000,
          engagement: 0.3,
          source: 'fallback',
          verified: false
        }
      },
      fraudDetection: {
        history: []
      }
    };

    const result = await fraudDetectionService.evaluateCreator(creator, {
      now: new Date('2026-03-27T10:00:00.000Z'),
      minFollowersForScoring: 1000
    });

    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.signals.some((s) => s.type === 'low_engagement')).toBe(true);
    expect(result.signals.some((s) => s.type === 'follow_ratio_anomaly')).toBe(true);
  });

  test('detects suspicious growth against recent history', async () => {
    const creator = {
      socialMedia: {
        tiktok: {
          followers: 100000,
          following: 900,
          engagement: 0.7,
          source: 'oauth',
          verified: true
        }
      },
      fraudDetection: {
        history: [
          {
            platform: 'tiktok',
            followers: 50000,
            following: 850,
            engagement: 2.1,
            source: 'oauth',
            capturedAt: new Date('2026-03-21T10:00:00.000Z')
          }
        ]
      }
    };

    const result = await fraudDetectionService.evaluateCreator(creator, {
      now: new Date('2026-03-27T10:00:00.000Z'),
      minFollowersForScoring: 1000
    });

    expect(result.signals.some((s) => s.type === 'rapid_growth')).toBe(true);
    expect(result.signals.some((s) => s.type === 'growth_engagement_divergence')).toBe(true);
    expect(result.riskLevel === 'medium' || result.riskLevel === 'high').toBe(true);
  });

  test('maps default persistence payload safely', () => {
    const persistence = fraudDetectionService.toPersistenceModel();

    expect(persistence).toEqual(
      expect.objectContaining({
        riskScore: 0,
        riskLevel: 'low',
        version: 'v1'
      })
    );
    expect(Array.isArray(persistence.signals)).toBe(true);
    expect(Array.isArray(persistence.history)).toBe(true);
  });
});
