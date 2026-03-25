// services/featuredService.js - COMPLETE NEW FILE
const FeaturedListing = require('../models/FeaturedListing');
const Campaign = require('../models/Campaign');
const Creator = require('../models/Creator');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const stripe = require('../config/stripe');

class FeaturedService {
  
  /**
   * Calculate price for featured listing
   */
  calculatePrice(packageName, days, options = {}) {
    const basePrices = {
      basic: 50,
      premium: 100,
      enterprise: 250,
      custom: 0
    };

    const dailyRates = {
      basic: 5,
      premium: 10,
      enterprise: 25,
      custom: 0
    };

    const basePrice = basePrices[packageName] || 50;
    const dailyRate = dailyRates[packageName] || 5;
    
    let total = basePrice + (dailyRate * days);
    
    // Apply discounts for longer durations
    if (days >= 30) total *= 0.8; // 20% off for monthly
    if (days >= 90) total *= 0.7; // 30% off for quarterly
    if (days >= 365) total *= 0.5; // 50% off for yearly
    
    // Add premium placement costs
    if (options.placement === 'homepage') total *= 1.5;
    if (options.placement === 'search_top') total *= 1.3;
    if (options.placement === 'category_top') total *= 1.2;
    
    // Add priority boost
    if (options.priority && options.priority > 1) {
      total *= (1 + (options.priority - 1) * 0.1);
    }
    
    return {
      package: packageName,
      days,
      basePrice,
      dailyRate,
      subtotal: basePrice + (dailyRate * days),
      discount: basePrice + (dailyRate * days) - total,
      total: Math.round(total * 100) / 100,
      currency: 'USD'
    };
  }

  /**
   * Check availability for dates
   */
  async checkAvailability(placement, startDate, endDate, category = null) {
    const query = {
      'placement.type': placement,
      status: { $in: ['active', 'pending'] },
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ]
    };

    if (category) {
      query['placement.category'] = category;
    }

    const conflicting = await FeaturedListing.countDocuments(query);
    
    // Define max concurrent listings per placement
    const maxConcurrent = {
      homepage: 5,
      search_top: 10,
      category_top: 3,
      sidebar: 8,
      featured_section: 12
    };

    const max = maxConcurrent[placement] || 5;
    const available = max - conflicting;

    return {
      available: available > 0,
      availableSlots: Math.max(0, available),
      totalSlots: max,
      conflicting
    };
  }

  /**
   * Get active featured listings for placement
   */
  async getActiveForPlacement(placement, category = null, limit = 10) {
    const now = new Date();
    
    const query = {
      'placement.type': placement,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    };

    if (category) {
      query['placement.category'] = category;
    }

    const listings = await FeaturedListing.find(query)
      .populate('targetId')
      .sort({ 'placement.priority': -1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Randomize if multiple listings have same priority
    const groupedByPriority = {};
    listings.forEach(listing => {
      const priority = listing.placement.priority || 1;
      if (!groupedByPriority[priority]) {
        groupedByPriority[priority] = [];
      }
      groupedByPriority[priority].push(listing);
    });

    const result = [];
    Object.keys(groupedByPriority)
      .sort((a, b) => b - a)
      .forEach(priority => {
        const items = groupedByPriority[priority];
        // Shuffle items with same priority
        const shuffled = this.shuffleArray(items);
        result.push(...shuffled);
      });

    return result;
  }

  /**
   * Create featured listing with payment
   */
  async createWithPayment(userId, listingData, paymentMethodId) {
    // Calculate price
    const priceCalc = this.calculatePrice(
      listingData.package.name,
      listingData.durationDays,
      {
        placement: listingData.placement.type,
        priority: listingData.placement.priority
      }
    );

    // Create listing
    const listing = await FeaturedListing.create({
      userId,
      ...listingData,
      package: {
        ...listingData.package,
        price: priceCalc.total,
        currency: 'USD'
      },
      payment: {
        amount: priceCalc.total,
        status: 'pending'
      },
      status: 'pending'
    });

    // Process payment if amount > 0
    if (priceCalc.total > 0) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(priceCalc.total * 100),
          currency: 'usd',
          payment_method: paymentMethodId,
          confirmation_method: 'manual',
          confirm: true,
          metadata: {
            featuredListingId: listing._id.toString(),
            userId: userId.toString()
          }
        });

        listing.payment.transactionId = paymentIntent.id;
        listing.payment.status = 'paid';
        listing.payment.paidAt = new Date();
        listing.status = 'active'; // Auto-activate if payment successful
        await listing.save();

        // Create payment record
        await Payment.create({
          transactionId: paymentIntent.id,
          type: 'featured',
          status: 'completed',
          amount: priceCalc.total,
          from: { userId, accountType: 'brand' },
          to: { userId: 'platform', accountType: 'admin' },
          description: `Featured listing payment for ${listing.targetType}`,
          metadata: { listingId: listing._id }
        });

        // Send notification
        await Notification.create({
          userId,
          type: 'system',
          title: 'Featured Listing Active',
          message: `Your featured listing is now active for ${listingData.durationDays} days.`,
          data: { listingId: listing._id }
        });

      } catch (error) {
        listing.payment.status = 'failed';
        listing.payment.metadata = { error: error.message };
        await listing.save();
        throw error;
      }
    } else {
      // Free listing
      listing.status = 'active';
      await listing.save();
    }

    return listing;
  }

  /**
   * Process renewal
   */
  async processRenewal(listingId) {
    const listing = await FeaturedListing.findById(listingId);
    
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new Error('Listing is not active');
    }

    // Calculate renewal price (same package, same duration)
    const priceCalc = this.calculatePrice(
      listing.package.name,
      listing.duration.days,
      {
        placement: listing.placement.type,
        priority: listing.placement.priority
      }
    );

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(priceCalc.total * 100),
      currency: 'usd',
      metadata: {
        featuredListingId: listing._id.toString(),
        renewal: true
      }
    });

    return {
      listing,
      renewalPrice: priceCalc.total,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    };
  }

  /**
   * Process expiration
   */
  async processExpiration() {
    const expired = await FeaturedListing.find({
      status: 'active',
      endDate: { $lt: new Date() }
    });

    for (const listing of expired) {
      listing.status = 'expired';
      await listing.save();

      // Notify user
      await Notification.create({
        userId: listing.userId,
        type: 'system',
        title: 'Featured Listing Expired',
        message: 'Your featured listing has expired. Renew now to maintain visibility.',
        data: { listingId: listing._id }
      });
    }

    return expired.length;
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(startDate, endDate) {
    const match = {
      status: 'active',
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const [overall, byPlacement, byType] = await Promise.all([
      // Overall stats
      FeaturedListing.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalImpressions: { $sum: '$performance.impressions' },
            totalClicks: { $sum: '$performance.clicks' },
            totalConversions: { $sum: '$performance.conversions' },
            totalRevenue: { $sum: '$performance.revenue' },
            avgCTR: { $avg: '$performance.ctr' },
            count: { $sum: 1 }
          }
        }
      ]),

      // By placement
      FeaturedListing.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$placement.type',
            impressions: { $sum: '$performance.impressions' },
            clicks: { $sum: '$performance.clicks' },
            conversions: { $sum: '$performance.conversions' },
            revenue: { $sum: '$performance.revenue' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            placement: '$_id',
            impressions: 1,
            clicks: 1,
            conversions: 1,
            revenue: 1,
            count: 1,
            ctr: { $multiply: [{ $divide: ['$clicks', '$impressions'] }, 100] }
          }
        }
      ]),

      // By target type
      FeaturedListing.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$targetType',
            impressions: { $sum: '$performance.impressions' },
            clicks: { $sum: '$performance.clicks' },
            conversions: { $sum: '$performance.conversions' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      overall: overall[0] || {
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        avgCTR: 0,
        count: 0
      },
      byPlacement,
      byType
    };
  }

  /**
   * Get recommendations for user
   */
  async getRecommendations(userId, userType) {
    if (userType === 'brand') {
      // Get brand's active campaigns
      const campaigns = await Campaign.find({ 
        brandId: userId,
        status: 'active'
      }).limit(5);

      // Get popular placements for their industry
      const brand = await require('../models/Brand').findById(userId);
      
      const recommendations = [
        {
          type: 'campaign',
          title: 'Feature your best campaign',
          description: 'Get more visibility for your top-performing campaign',
          placement: 'homepage',
          estimatedReach: '10,000+ views',
          price: this.calculatePrice('premium', 7).total
        },
        {
          type: 'brand',
          title: 'Boost your brand profile',
          description: 'Appear in featured brand section',
          placement: 'sidebar',
          estimatedReach: '5,000+ views',
          price: this.calculatePrice('basic', 30).total
        }
      ];

      return recommendations;
    } else {
      // For creators
      const recommendations = [
        {
          type: 'creator',
          title: 'Get discovered by brands',
          description: 'Appear in top search results',
          placement: 'search_top',
          estimatedReach: '100+ brand views',
          price: this.calculatePrice('premium', 14).total
        }
      ];

      return recommendations;
    }
  }

  /**
   * Shuffle array helper
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = new FeaturedService();