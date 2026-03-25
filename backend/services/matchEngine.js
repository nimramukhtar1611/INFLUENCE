// services/matchEngine.js - COMPLETE FIXED VERSION
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');

class MatchEngine {
  
  // ==================== MAIN MATCH SCORE CALCULATION ====================
  async calculateMatchScore(creator, campaign) {
    try {
      let score = 0;
      let totalWeight = 0;
      const breakdown = {};

      // 1. Niche/Category Match (Weight: 30%)
      const nicheScore = this.calculateNicheMatch(creator.niches, campaign.category, campaign.targetAudience?.niches);
      score += nicheScore.score * 0.3;
      totalWeight += 0.3;
      breakdown.niche = nicheScore;

      // 2. Follower Range Match (Weight: 20%)
      const followerScore = this.calculateFollowerMatch(
        creator.totalFollowers,
        campaign.targetAudience?.minFollowers,
        campaign.targetAudience?.maxFollowers
      );
      score += followerScore.score * 0.2;
      totalWeight += 0.2;
      breakdown.followers = followerScore;

      // 3. Engagement Quality (Weight: 25%)
      const engagementScore = await this.calculateEngagementQuality(creator, campaign);
      score += engagementScore.score * 0.25;
      totalWeight += 0.25;
      breakdown.engagement = engagementScore;

      // 4. Platform Match (Weight: 15%)
      const platformScore = this.calculatePlatformMatch(creator.socialMedia, campaign.targetAudience?.platforms);
      score += platformScore.score * 0.15;
      totalWeight += 0.15;
      breakdown.platform = platformScore;

      // 5. Activity Recency (Weight: 10%)
      const recencyScore = this.calculateRecencyScore(creator.lastActive);
      score += recencyScore.score * 0.1;
      totalWeight += 0.1;
      breakdown.recency = recencyScore;

      // Calculate final score (0-100)
      const finalScore = totalWeight > 0 ? (score / totalWeight) * 100 : 0;

      // Determine match level
      let level = 'poor';
      let reason = '';

      if (finalScore >= 80) {
        level = 'excellent';
        reason = 'Perfect match for this campaign!';
      } else if (finalScore >= 60) {
        level = 'good';
        reason = 'Good fit for this campaign';
      } else if (finalScore >= 40) {
        level = 'average';
        reason = 'Average match - consider reviewing requirements';
      } else {
        level = 'poor';
        reason = 'Not the best fit for this campaign';
      }

      return {
        score: Math.round(finalScore * 100) / 100,
        level,
        reason,
        breakdown,
        recommendation: finalScore >= 60 ? 'highly_recommend' : finalScore >= 40 ? 'consider' : 'avoid'
      };
    } catch (error) {
      console.error('Match score calculation error:', error);
      return {
        score: 0,
        level: 'error',
        reason: 'Could not calculate match score',
        breakdown: {}
      };
    }
  }

  // ==================== CAMPAIGN MATCH FOR CREATOR ====================
  async calculateCampaignMatch(campaign, creator) {
    return this.calculateMatchScore(creator, campaign);
  }

  // ==================== BRAND MATCH FOR CREATOR ====================
  async calculateBrandMatch(creator, brand) {
    try {
      let score = 0;
      let totalWeight = 0;
      const breakdown = {};

      // Get brand's past campaigns
      const pastCampaigns = await Campaign.find({ brandId: brand._id }).lean();
      const brandCategories = [...new Set(pastCampaigns.map(c => c.category))];

      // 1. Niche match with brand's industry (Weight: 40%)
      const nicheScore = this.calculateNicheMatch(creator.niches, brand.industry, brandCategories);
      score += nicheScore.score * 0.4;
      totalWeight += 0.4;
      breakdown.niche = nicheScore;

      // 2. Past collaboration success (Weight: 30%)
      const pastDeals = await Deal.find({ 
        brandId: brand._id,
        creatorId: creator._id,
        status: 'completed'
      }).lean();

      const pastScore = this.calculatePastCollaborationScore(pastDeals);
      score += pastScore.score * 0.3;
      totalWeight += 0.3;
      breakdown.pastCollaboration = pastScore;

      // 3. Budget compatibility (Weight: 30%)
      const budgetScore = this.calculateBudgetMatch(creator.rateCard, pastCampaigns);
      score += budgetScore.score * 0.3;
      totalWeight += 0.3;
      breakdown.budget = budgetScore;

      const finalScore = totalWeight > 0 ? (score / totalWeight) * 100 : 0;

      return {
        score: Math.round(finalScore * 100) / 100,
        breakdown,
        reason: this.getMatchReason(finalScore, 'brand')
      };
    } catch (error) {
      console.error('Brand match calculation error:', error);
      return { score: 0, breakdown: {} };
    }
  }

  // ==================== NICHE MATCH CALCULATION ====================
  calculateNicheMatch(creatorNiches, campaignCategory, campaignNiches = []) {
    if (!creatorNiches || creatorNiches.length === 0) {
      return { score: 0, reason: 'Creator has no niches defined' };
    }

    const allCampaignNiches = [campaignCategory, ...(campaignNiches || [])].filter(Boolean);
    
    if (allCampaignNiches.length === 0) {
      return { score: 0.5, reason: 'No niche preferences specified' };
    }

    // Convert to lowercase for comparison
    const creatorNicheSet = new Set(creatorNiches.map(n => n.toLowerCase()));
    const campaignNicheSet = new Set(allCampaignNiches.map(n => n.toLowerCase()));

    // Calculate exact matches
    const exactMatches = [...campaignNicheSet].filter(niche => creatorNicheSet.has(niche)).length;
    
    // Calculate related matches (you can expand this with a niche relationship map)
    const relatedMatches = 0; // Placeholder for future enhancement

    const totalCampaignNiches = campaignNicheSet.size;
    const matchPercentage = totalCampaignNiches > 0 
      ? (exactMatches / totalCampaignNiches) * 100 
      : 100;

    // Normalize to 0-1 score
    const score = Math.min(1, matchPercentage / 100);

    let reason;
    if (score >= 0.8) reason = 'Perfect niche alignment';
    else if (score >= 0.5) reason = 'Good niche overlap';
    else if (score > 0) reason = 'Partial niche match';
    else reason = 'No niche match';

    return {
      score,
      exactMatches,
      totalCampaignNiches,
      matchPercentage: Math.round(matchPercentage * 100) / 100,
      reason
    };
  }

  // ==================== FOLLOWER MATCH CALCULATION ====================
  calculateFollowerMatch(followers, minFollowers, maxFollowers) {
    if (!followers) {
      return { score: 0, reason: 'No follower data available' };
    }

    // If no range specified, score based on general size
    if (!minFollowers && !maxFollowers) {
      // Score based on follower count (1M+ = 1.0, 100k = 0.8, 10k = 0.6, 1k = 0.4)
      let score = 0.4;
      if (followers >= 1000000) score = 1.0;
      else if (followers >= 500000) score = 0.95;
      else if (followers >= 100000) score = 0.8;
      else if (followers >= 50000) score = 0.7;
      else if (followers >= 10000) score = 0.6;
      else if (followers >= 5000) score = 0.5;
      
      return { 
        score, 
        reason: `Creator has ${this.formatNumber(followers)} followers` 
      };
    }

    // Calculate how well creator fits in the range
    const min = minFollowers || 0;
    const max = maxFollowers || Infinity;

    if (followers < min) {
      const deficit = ((min - followers) / min) * 100;
      return {
        score: Math.max(0, 1 - (deficit / 100)),
        reason: `${this.formatNumber(followers)} followers (below minimum)`
      };
    }

    if (followers > max) {
      const excess = ((followers - max) / max) * 100;
      return {
        score: Math.max(0.5, 1 - (excess / 200)), // Still good if slightly above
        reason: `${this.formatNumber(followers)} followers (above maximum)`
      };
    }

    // Perfect fit
    const rangeSize = max - min;
    const position = rangeSize > 0 ? (followers - min) / rangeSize : 1;
    const score = 0.9 + (position * 0.1); // 0.9-1.0 based on position

    return {
      score,
      reason: `${this.formatNumber(followers)} followers (within target range)`
    };
  }

  // ==================== ENGAGEMENT QUALITY CALCULATION ====================
  async calculateEngagementQuality(creator, campaign) {
    try {
      // Get average engagement across platforms
      let totalEngagement = 0;
      let platformCount = 0;

      if (creator.socialMedia?.instagram?.engagement) {
        totalEngagement += creator.socialMedia.instagram.engagement;
        platformCount++;
      }
      if (creator.socialMedia?.youtube?.engagement) {
        totalEngagement += creator.socialMedia.youtube.engagement;
        platformCount++;
      }
      if (creator.socialMedia?.tiktok?.engagement) {
        totalEngagement += creator.socialMedia.tiktok.engagement;
        platformCount++;
      }

      const avgEngagement = platformCount > 0 ? totalEngagement / platformCount : 0;

      // Score based on engagement rate
      let score = 0;
      if (avgEngagement >= 5) score = 1.0;      // Excellent
      else if (avgEngagement >= 3) score = 0.9;  // Very Good
      else if (avgEngagement >= 2) score = 0.8;  // Good
      else if (avgEngagement >= 1) score = 0.6;  // Average
      else if (avgEngagement >= 0.5) score = 0.4; // Below Average
      else score = 0.2;                           // Poor

      // Adjust based on past performance
      const pastDeals = await Deal.find({ 
        creatorId: creator._id,
        status: 'completed',
        'metrics.engagement': { $exists: true }
      }).lean();

      if (pastDeals.length > 0) {
        const avgPastEngagement = pastDeals.reduce((sum, d) => 
          sum + (d.metrics?.engagement || 0), 0) / pastDeals.length;
        
        // Boost score if past engagement was good
        if (avgPastEngagement > avgEngagement) {
          score = Math.min(1, score * 1.1);
        }
      }

      return {
        score,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        platformCount,
        pastDealsCount: pastDeals.length,
        reason: `${avgEngagement.toFixed(2)}% average engagement rate`
      };
    } catch (error) {
      console.error('Engagement calculation error:', error);
      return { score: 0.5, reason: 'Could not calculate engagement' };
    }
  }

  // ==================== PLATFORM MATCH CALCULATION ====================
  calculatePlatformMatch(socialMedia, targetPlatforms = []) {
    if (!targetPlatforms || targetPlatforms.length === 0) {
      return { score: 1.0, reason: 'No platform restrictions' };
    }

    const availablePlatforms = [];
    if (socialMedia?.instagram?.handle) availablePlatforms.push('instagram');
    if (socialMedia?.youtube?.handle) availablePlatforms.push('youtube');
    if (socialMedia?.tiktok?.handle) availablePlatforms.push('tiktok');
    if (socialMedia?.twitter?.handle) availablePlatforms.push('twitter');

    if (availablePlatforms.length === 0) {
      return { score: 0, reason: 'No social media connected' };
    }

    const matches = targetPlatforms.filter(p => availablePlatforms.includes(p)).length;
    const score = matches / targetPlatforms.length;

    let reason;
    if (score >= 1) reason = 'Has all required platforms';
    else if (score >= 0.5) reason = `Has ${matches}/${targetPlatforms.length} required platforms`;
    else reason = `Missing most required platforms`;

    return {
      score,
      matches,
      required: targetPlatforms.length,
      available: availablePlatforms,
      reason
    };
  }

  // ==================== RECENCY SCORE CALCULATION ====================
  calculateRecencyScore(lastActive) {
    if (!lastActive) {
      return { score: 0.3, reason: 'Activity unknown' };
    }

    const daysSinceActive = Math.floor((Date.now() - new Date(lastActive)) / (1000 * 60 * 60 * 24));
    
    let score;
    if (daysSinceActive <= 1) score = 1.0;
    else if (daysSinceActive <= 3) score = 0.9;
    else if (daysSinceActive <= 7) score = 0.8;
    else if (daysSinceActive <= 14) score = 0.6;
    else if (daysSinceActive <= 30) score = 0.4;
    else if (daysSinceActive <= 60) score = 0.2;
    else score = 0.1;

    return {
      score,
      daysSinceActive,
      reason: daysSinceActive <= 7 
        ? 'Recently active' 
        : `Last active ${daysSinceActive} days ago`
    };
  }

  // ==================== PAST COLLABORATION SCORE ====================
  calculatePastCollaborationScore(pastDeals) {
    if (!pastDeals || pastDeals.length === 0) {
      return { score: 0.5, reason: 'No past collaboration' };
    }

    let totalScore = 0;
    let completedOnTime = 0;
    let highRated = 0;

    pastDeals.forEach(deal => {
      // On-time completion
      if (deal.completedAt && deal.deadline) {
        if (new Date(deal.completedAt) <= new Date(deal.deadline)) {
          completedOnTime++;
        }
      }

      // Rating
      if (deal.rating?.score && deal.rating.score >= 4) {
        highRated++;
      }

      // Base score
      totalScore += 0.8;
    });

    const avgScore = totalScore / pastDeals.length;
    const onTimeRate = completedOnTime / pastDeals.length;
    const ratingRate = highRated / pastDeals.length;

    const finalScore = (avgScore * 0.4) + (onTimeRate * 0.3) + (ratingRate * 0.3);

    return {
      score: finalScore,
      pastDealsCount: pastDeals.length,
      completedOnTime,
      highRated,
      reason: `${pastDeals.length} past ${pastDeals.length === 1 ? 'deal' : 'deals'}`
    };
  }

  // ==================== BUDGET MATCH CALCULATION ====================
  calculateBudgetMatch(rateCard, pastCampaigns) {
    if (!rateCard) {
      return { score: 0.5, reason: 'No rate card available' };
    }

    // Get average rates
    const rates = [];
    if (rateCard.instagram?.post) rates.push(rateCard.instagram.post);
    if (rateCard.youtube?.video) rates.push(rateCard.youtube.video);
    if (rateCard.tiktok?.video) rates.push(rateCard.tiktok.video);

    if (rates.length === 0) {
      return { score: 0.5, reason: 'No rates defined' };
    }

    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;

    // Get average campaign budget from past campaigns
    if (pastCampaigns.length > 0) {
      const avgCampaignBudget = pastCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0) / pastCampaigns.length;
      
      if (avgCampaignBudget > 0) {
        const ratio = avgRate / avgCampaignBudget;
        
        if (ratio <= 0.8) {
          return { score: 1.0, reason: 'Rates are competitive' };
        } else if (ratio <= 1.2) {
          return { score: 0.8, reason: 'Rates are aligned with market' };
        } else {
          return { score: 0.5, reason: 'Rates are above average' };
        }
      }
    }

    return { score: 0.7, reason: 'Rates available' };
  }

  // ==================== GET MATCH REASON ====================
  getMatchReason(score, type) {
    if (score >= 80) {
      return type === 'brand' 
        ? 'Excellent match for this brand!' 
        : 'Perfect fit for this campaign!';
    }
    if (score >= 60) {
      return type === 'brand'
        ? 'Good potential for collaboration'
        : 'Good match for this campaign';
    }
    if (score >= 40) {
      return type === 'brand'
        ? 'Consider this creator for future'
        : 'Average match - review requirements';
    }
    return type === 'brand'
      ? 'Not the best fit at this time'
      : 'Not the best fit for this campaign';
  }

  // ==================== HELPER FUNCTIONS ====================
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}

module.exports = new MatchEngine();