const { featureFlags } = require('../config/featureFlags');

const TRUSTED_SOURCES = new Set(['oauth', 'youtube-api', 'rapidapi', 'tikwm', 'twitter-api']);

class FraudDetectionService {
  isEnabled() {
    return featureFlags.fraudDetection.enabled;
  }

  getDefaultAssessment() {
    return {
      score: 0,
      riskLevel: 'low',
      version: 'v1',
      manualReviewRequired: false,
      holdReason: '',
      holdAppliedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: '',
      lastEvaluatedAt: null,
      signals: [],
      history: []
    };
  }

  async evaluateCreator(creator, options = {}) {
    if (!creator) {
      return this.getDefaultAssessment();
    }

    const now = options.now ? new Date(options.now) : new Date();
    const minFollowersForScoring = Number.isFinite(options.minFollowersForScoring)
      ? options.minFollowersForScoring
      : featureFlags.fraudDetection.minFollowersForScoring;
    const maxHistoryEntries = Number.isFinite(options.maxHistoryEntries)
      ? options.maxHistoryEntries
      : featureFlags.fraudDetection.maxHistoryEntries;

    const platforms = this.extractPlatformMetrics(creator, minFollowersForScoring);
    const history = Array.isArray(creator.fraudDetection?.history)
      ? creator.fraudDetection.history
      : [];

    const signals = [];

    for (const platformMetric of platforms) {
      signals.push(...this.detectLowEngagement(platformMetric));
      signals.push(...this.detectFollowRatioAnomaly(platformMetric));
      signals.push(...this.detectUntrustedSource(platformMetric));

      const lastSnapshot = this.getLatestSnapshot(history, platformMetric.platform);
      if (lastSnapshot) {
        signals.push(...this.detectRapidGrowth(platformMetric, lastSnapshot, now));
        signals.push(...this.detectGrowthEngagementDivergence(platformMetric, lastSnapshot, now));
      }
    }

    const score = this.calculateRiskScore(signals);
    const riskLevel = this.toRiskLevel(score);

    const mergedHistory = this.mergeHistory(history, platforms, now, maxHistoryEntries);

    return {
      score,
      riskLevel,
      version: 'v1',
      lastEvaluatedAt: now,
      signals,
      history: mergedHistory
    };
  }

  toPersistenceModel(assessment) {
    if (!assessment) {
      const fallback = this.getDefaultAssessment();
      return {
        riskScore: fallback.score,
        riskLevel: fallback.riskLevel,
        version: fallback.version,
        manualReviewRequired: fallback.manualReviewRequired,
        holdReason: fallback.holdReason,
        holdAppliedAt: fallback.holdAppliedAt,
        reviewedAt: fallback.reviewedAt,
        reviewedBy: fallback.reviewedBy,
        reviewNotes: fallback.reviewNotes,
        lastEvaluatedAt: fallback.lastEvaluatedAt,
        signals: fallback.signals,
        history: fallback.history
      };
    }

    return {
      riskScore: assessment.score || 0,
      riskLevel: assessment.riskLevel || 'low',
      version: assessment.version || 'v1',
      manualReviewRequired: Boolean(assessment.manualReviewRequired),
      holdReason: assessment.holdReason || '',
      holdAppliedAt: assessment.holdAppliedAt || null,
      reviewedAt: assessment.reviewedAt || null,
      reviewedBy: assessment.reviewedBy || null,
      reviewNotes: assessment.reviewNotes || '',
      lastEvaluatedAt: assessment.lastEvaluatedAt || new Date(),
      signals: Array.isArray(assessment.signals) ? assessment.signals : [],
      history: Array.isArray(assessment.history) ? assessment.history : []
    };
  }

  applySoftEnforcement(existingFraudDetection = {}, assessment) {
    const nextModel = this.toPersistenceModel(assessment);
    const existing = existingFraudDetection || {};

    const merged = {
      ...nextModel,
      manualReviewRequired: Boolean(existing.manualReviewRequired),
      holdReason: existing.holdReason || '',
      holdAppliedAt: existing.holdAppliedAt || null,
      reviewedAt: existing.reviewedAt || null,
      reviewedBy: existing.reviewedBy || null,
      reviewNotes: existing.reviewNotes || ''
    };

    if (!featureFlags.fraudDetection.enforcementEnabled) {
      return merged;
    }

    if (nextModel.riskLevel !== 'high') {
      return merged;
    }

    return {
      ...merged,
      manualReviewRequired: true,
      holdReason: this.buildManualReviewReason(nextModel),
      holdAppliedAt: merged.holdAppliedAt || new Date(),
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: ''
    };
  }

  buildManualReviewReason(persistenceModel) {
    const signals = Array.isArray(persistenceModel.signals) ? persistenceModel.signals : [];
    if (!signals.length) {
      return 'High fraud risk detected by automated checks.';
    }

    return signals
      .slice(0, 3)
      .map((signal) => signal.reason || signal.type)
      .filter(Boolean)
      .join(' | ');
  }

  extractPlatformMetrics(creator, minFollowersForScoring) {
    const social = creator.socialMedia || {};
    const platforms = [
      {
        platform: 'instagram',
        followers: Number(social.instagram?.followers || 0),
        following: Number(social.instagram?.following || 0),
        engagement: Number(social.instagram?.engagement || 0),
        source: social.instagram?.source || '',
        verified: Boolean(social.instagram?.verified),
        lastSynced: social.instagram?.lastSynced || creator.lastSocialSync || null
      },
      {
        platform: 'youtube',
        followers: Number(social.youtube?.subscribers || 0),
        following: 0,
        engagement: Number(social.youtube?.engagement || 0),
        source: social.youtube?.source || '',
        verified: Boolean(social.youtube?.verified),
        lastSynced: social.youtube?.lastSynced || creator.lastSocialSync || null
      },
      {
        platform: 'tiktok',
        followers: Number(social.tiktok?.followers || 0),
        following: Number(social.tiktok?.following || 0),
        engagement: Number(social.tiktok?.engagement || 0),
        source: social.tiktok?.source || '',
        verified: Boolean(social.tiktok?.verified),
        lastSynced: social.tiktok?.lastSynced || creator.lastSocialSync || null
      },
      {
        platform: 'twitter',
        followers: Number(social.twitter?.followers || 0),
        following: Number(social.twitter?.following || 0),
        engagement: Number(social.twitter?.engagement || 0),
        source: social.twitter?.source || '',
        verified: Boolean(social.twitter?.verified),
        lastSynced: social.twitter?.lastSynced || creator.lastSocialSync || null
      }
    ];

    return platforms.filter((p) => p.followers >= minFollowersForScoring);
  }

  detectLowEngagement(metric) {
    const followers = metric.followers;
    const engagement = metric.engagement;
    let threshold = null;
    let weight = 0;
    let severity = 'low';

    if (followers >= 100000) {
      threshold = 0.7;
      weight = 35;
      severity = 'high';
    } else if (followers >= 25000) {
      threshold = 0.9;
      weight = 25;
      severity = 'medium';
    } else if (followers >= 10000) {
      threshold = 1.2;
      weight = 15;
      severity = 'low';
    }

    if (threshold === null || engagement >= threshold) {
      return [];
    }

    return [{
      type: 'low_engagement',
      platform: metric.platform,
      severity,
      weight,
      value: Number(engagement.toFixed(3)),
      threshold,
      reason: `Engagement ${engagement.toFixed(2)}% is below expected threshold ${threshold.toFixed(2)}% for ${followers.toLocaleString()} followers`,
      detectedAt: new Date()
    }];
  }

  detectFollowRatioAnomaly(metric) {
    if (!metric.following || metric.platform === 'youtube') return [];

    const ratio = metric.followers > 0 ? metric.following / metric.followers : 0;
    if (metric.followers < 10000 || ratio <= 1.8) return [];

    const severity = ratio >= 2.5 ? 'high' : 'medium';
    const weight = ratio >= 2.5 ? 25 : 15;

    return [{
      type: 'follow_ratio_anomaly',
      platform: metric.platform,
      severity,
      weight,
      value: Number(ratio.toFixed(3)),
      threshold: 1.8,
      reason: `Following-to-follower ratio ${ratio.toFixed(2)} exceeds threshold 1.80`,
      detectedAt: new Date()
    }];
  }

  detectUntrustedSource(metric) {
    const source = String(metric.source || '').toLowerCase().trim();
    if (!source || TRUSTED_SOURCES.has(source) || metric.verified) return [];

    return [{
      type: 'untrusted_data_source',
      platform: metric.platform,
      severity: 'low',
      weight: 8,
      value: 1,
      threshold: 0,
      reason: `Social data source "${source}" is not trusted for fraud verification`,
      detectedAt: new Date()
    }];
  }

  detectRapidGrowth(metric, snapshot, now) {
    const previousFollowers = Number(snapshot.followers || 0);
    if (previousFollowers <= 0 || metric.followers <= previousFollowers) return [];

    const days = this.daysBetween(snapshot.capturedAt, now);
    if (days <= 0 || days > 30) return [];

    const growthPct = ((metric.followers - previousFollowers) / previousFollowers) * 100;

    const threshold = days <= 7 ? 70 : 150;
    if (growthPct < threshold) {
      return [];
    }

    const severity = growthPct >= 200 ? 'high' : 'medium';
    const weight = growthPct >= 200 ? 30 : 20;

    return [{
      type: 'rapid_growth',
      platform: metric.platform,
      severity,
      weight,
      value: Number(growthPct.toFixed(2)),
      threshold,
      reason: `Follower growth of ${growthPct.toFixed(1)}% within ${days} day(s) is unusually high`,
      detectedAt: now
    }];
  }

  detectGrowthEngagementDivergence(metric, snapshot, now) {
    const previousFollowers = Number(snapshot.followers || 0);
    const previousEngagement = Number(snapshot.engagement || 0);
    if (previousFollowers <= 0 || previousEngagement <= 0) return [];

    const days = this.daysBetween(snapshot.capturedAt, now);
    if (days <= 0 || days > 30) return [];

    const growthPct = ((metric.followers - previousFollowers) / previousFollowers) * 100;
    const engagementDropPct = ((previousEngagement - metric.engagement) / previousEngagement) * 100;

    if (growthPct < 40 || engagementDropPct < 35) {
      return [];
    }

    return [{
      type: 'growth_engagement_divergence',
      platform: metric.platform,
      severity: growthPct > 80 ? 'high' : 'medium',
      weight: growthPct > 80 ? 28 : 18,
      value: Number(growthPct.toFixed(2)),
      threshold: 40,
      reason: `Followers grew ${growthPct.toFixed(1)}% while engagement dropped ${engagementDropPct.toFixed(1)}% in ${days} day(s)`,
      detectedAt: now
    }];
  }

  getLatestSnapshot(history, platform) {
    return history
      .filter((h) => h.platform === platform && h.capturedAt)
      .sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))[0] || null;
  }

  mergeHistory(existingHistory, platforms, now, maxHistoryEntries) {
    const nextHistory = Array.isArray(existingHistory) ? [...existingHistory] : [];
    const nowDate = new Date(now);

    for (const metric of platforms) {
      const latest = this.getLatestSnapshot(nextHistory, metric.platform);
      const shouldAdd = !latest || this.daysBetween(latest.capturedAt, nowDate) >= 1;

      if (!shouldAdd) continue;

      nextHistory.push({
        platform: metric.platform,
        followers: metric.followers,
        following: metric.following,
        engagement: Number(metric.engagement.toFixed(3)),
        source: metric.source || '',
        capturedAt: nowDate
      });
    }

    return nextHistory
      .sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt))
      .slice(-maxHistoryEntries);
  }

  calculateRiskScore(signals) {
    const totalWeight = signals.reduce((sum, s) => sum + Number(s.weight || 0), 0);
    return Math.max(0, Math.min(100, Math.round(totalWeight)));
  }

  toRiskLevel(score) {
    if (score >= 65) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  daysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;

    const ms = endDate.getTime() - startDate.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }
}

module.exports = new FraudDetectionService();
