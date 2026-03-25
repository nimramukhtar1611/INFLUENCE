// services/paymentCalculator.js - COMPLETE FIXED VERSION
const Fee = require('../models/Fee');
const subscriptionPlans = require('../config/subscriptionPlans');

class PaymentCalculator {
  
  // ==================== CALCULATE FEES ====================
  async calculateFees(amount, userType, planId = 'free') {
    try {
      // Get base commission rate
      let commissionRate = subscriptionPlans.commissions.default;
      
      // Adjust based on plan
      if (planId === 'professional') {
        commissionRate = subscriptionPlans.commissions.premium;
      } else if (planId === 'enterprise') {
        commissionRate = subscriptionPlans.commissions.enterprise;
      }

      // Calculate platform fee
      const platformFee = (amount * commissionRate) / 100;

      // Calculate transaction fees (Stripe)
      const transactionFee = (amount * subscriptionPlans.transactionFees.stripe) / 100 + 
                             subscriptionPlans.transactionFees.stripeFixed;

      // Total fees
      const totalFees = platformFee + transactionFee;

      // Net amount
      const netAmount = amount - totalFees;

      return {
        originalAmount: amount,
        platformFee: {
          rate: commissionRate,
          amount: parseFloat(platformFee.toFixed(2))
        },
        transactionFee: {
          rate: subscriptionPlans.transactionFees.stripe,
          fixed: subscriptionPlans.transactionFees.stripeFixed,
          amount: parseFloat(transactionFee.toFixed(2))
        },
        total: parseFloat(totalFees.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2))
      };
    } catch (error) {
      console.error('Fee calculation error:', error);
      throw error;
    }
  }

  // ==================== CALCULATE WITHDRAWAL FEES ====================
  async calculateWithdrawalFees(amount, method) {
    try {
      let fee = 0;
      let feeType = 'fixed';
      let feeRate = 0;

      switch(method) {
        case 'bank_account':
          fee = subscriptionPlans.withdrawalFees.bank;
          feeType = 'fixed';
          break;
        case 'paypal':
          fee = (amount * subscriptionPlans.withdrawalFees.paypal) / 100;
          feeType = 'percentage';
          feeRate = subscriptionPlans.withdrawalFees.paypal;
          break;
        case 'wire':
          fee = subscriptionPlans.withdrawalFees.wire;
          feeType = 'fixed';
          break;
        default:
          fee = 0;
      }

      return {
        originalAmount: amount,
        fee: {
          type: feeType,
          rate: feeRate,
          amount: parseFloat(fee.toFixed(2))
        },
        total: parseFloat(fee.toFixed(2)),
        netAmount: parseFloat((amount - fee).toFixed(2))
      };
    } catch (error) {
      console.error('Withdrawal fee calculation error:', error);
      throw error;
    }
  }

  // ==================== CALCULATE PERFORMANCE PAYMENT ====================
  async calculatePerformancePayment(deal, paymentType, metrics, isFinal = false) {
    try {
      let baseAmount = deal.budget;
      let finalAmount = baseAmount;
      let bonus = 0;
      const breakdown = {};

      switch(paymentType) {
        case 'cpe': // Cost Per Engagement
          breakdown.cpe = await this.calculateCPE(deal, metrics);
          finalAmount = breakdown.cpe.finalAmount;
          bonus = breakdown.cpe.bonus;
          break;

        case 'cpa': // Cost Per Acquisition
          breakdown.cpa = await this.calculateCPA(deal, metrics);
          finalAmount = breakdown.cpa.finalAmount;
          bonus = breakdown.cpa.bonus;
          break;

        case 'cpm': // Cost Per Mille (thousand impressions)
          breakdown.cpm = await this.calculateCPM(deal, metrics);
          finalAmount = breakdown.cpm.finalAmount;
          bonus = breakdown.cpm.bonus;
          break;

        default:
          throw new Error('Invalid payment type');
      }

      // Calculate fees on final amount
      const fees = await this.calculateFees(finalAmount, deal.brandId?.userType);

      return {
        paymentType,
        baseAmount,
        finalAmount: parseFloat(finalAmount.toFixed(2)),
        bonus: parseFloat(bonus.toFixed(2)),
        fees,
        breakdown,
        metrics: {
          ...metrics,
          calculatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Performance payment calculation error:', error);
      throw error;
    }
  }

  // ==================== CALCULATE CPE (Cost Per Engagement) ====================
  async calculateCPE(deal, metrics) {
    const {
      likes = 0,
      comments = 0,
      shares = 0,
      saves = 0,
      targetLikes = 100,
      targetComments = 50,
      targetShares = 20,
      targetSaves = 30,
      baseRate = deal.budget,
      bonusRate = 0.5 // 50% bonus for exceeding targets
    } = metrics;

    // Calculate total engagement
    const totalEngagement = likes + comments + shares + saves;
    const targetEngagement = targetLikes + targetComments + targetShares + targetSaves;

    // Calculate base payment (prorated based on engagement achieved)
    let finalAmount = baseRate;
    let bonus = 0;

    if (totalEngagement >= targetEngagement) {
      // Full base payment
      finalAmount = baseRate;
      
      // Calculate bonus for exceeding targets
      const excessEngagement = totalEngagement - targetEngagement;
      const bonusMultiplier = excessEngagement / targetEngagement;
      bonus = baseRate * bonusRate * Math.min(bonusMultiplier, 2); // Cap at 2x bonus
    } else {
      // Partial payment based on percentage achieved
      const achievementRate = totalEngagement / targetEngagement;
      finalAmount = baseRate * achievementRate;
    }

    return {
      totalEngagement,
      targetEngagement,
      achievementRate: parseFloat((totalEngagement / targetEngagement * 100).toFixed(2)),
      baseAmount: baseRate,
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      bonus: parseFloat(bonus.toFixed(2)),
      breakdown: {
        likes: { achieved: likes, target: targetLikes, rate: likes / targetLikes },
        comments: { achieved: comments, target: targetComments, rate: comments / targetComments },
        shares: { achieved: shares, target: targetShares, rate: shares / targetShares },
        saves: { achieved: saves, target: targetSaves, rate: saves / targetSaves }
      }
    };
  }

  // ==================== CALCULATE CPA (Cost Per Acquisition) ====================
  async calculateCPA(deal, metrics) {
    const {
      conversions = 0,
      targetConversions = 10,
      saleValue = 0,
      commissionRate = 0.1, // 10% commission on sales
      baseRate = deal.budget,
      bonusRate = 0.3 // 30% bonus for exceeding targets
    } = metrics;

    let finalAmount = 0;
    let bonus = 0;

    if (saleValue > 0) {
      // Commission-based CPA
      finalAmount = saleValue * commissionRate;
    } else {
      // Fixed rate per conversion
      const perConversionRate = baseRate / targetConversions;
      finalAmount = conversions * perConversionRate;
    }

    // Calculate bonus for exceeding conversion targets
    if (conversions > targetConversions) {
      const excessConversions = conversions - targetConversions;
      const bonusMultiplier = excessConversions / targetConversions;
      bonus = finalAmount * bonusRate * Math.min(bonusMultiplier, 1);
      finalAmount += bonus;
    }

    return {
      conversions,
      targetConversions,
      conversionRate: parseFloat((conversions / targetConversions * 100).toFixed(2)),
      perConversionRate: saleValue > 0 ? commissionRate : (baseRate / targetConversions),
      baseAmount: baseRate,
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      bonus: parseFloat(bonus.toFixed(2)),
      saleValue
    };
  }

  // ==================== CALCULATE CPM (Cost Per Mille) ====================
  async calculateCPM(deal, metrics) {
    const {
      impressions = 0,
      targetImpressions = 10000,
      cpmRate = 10, // $10 per 1000 impressions
      baseRate = deal.budget,
      bonusRate = 0.2 // 20% bonus for exceeding targets
    } = metrics;

    // Calculate based on CPM
    const thousands = impressions / 1000;
    let finalAmount = thousands * cpmRate;
    let bonus = 0;

    // Cap at base rate if specified
    if (baseRate && finalAmount > baseRate) {
      finalAmount = baseRate;
    }

    // Calculate bonus for exceeding impression targets
    if (impressions > targetImpressions) {
      const excessImpressions = impressions - targetImpressions;
      const excessThousands = excessImpressions / 1000;
      bonus = excessThousands * cpmRate * bonusRate;
      finalAmount += bonus;
    }

    return {
      impressions,
      targetImpressions,
      thousands,
      cpmRate,
      achievementRate: parseFloat((impressions / targetImpressions * 100).toFixed(2)),
      baseAmount: baseRate,
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      bonus: parseFloat(bonus.toFixed(2))
    };
  }

  // ==================== CALCULATE REVENUE SHARE ====================
  async calculateRevenueShare(deal, metrics) {
    const {
      revenue = 0,
      sharePercentage = 20, // 20% revenue share
      baseRate = deal.budget,
      minimumGuarantee = 0
    } = metrics;

    // Calculate revenue share
    const revenueShare = revenue * (sharePercentage / 100);
    
    // Final amount is either revenue share or minimum guarantee, whichever is higher
    let finalAmount = Math.max(revenueShare, minimumGuarantee);

    return {
      revenue,
      sharePercentage,
      revenueShare: parseFloat(revenueShare.toFixed(2)),
      minimumGuarantee,
      finalAmount: parseFloat(finalAmount.toFixed(2))
    };
  }

  // ==================== CALCULATE HYBRID PAYMENT ====================
  async calculateHybridPayment(deal, metrics) {
    const {
      baseRate = deal.budget * 0.5, // 50% base
      performanceMetrics = {},
      performanceWeight = 0.5 // 50% performance-based
    } = metrics;

    // Calculate base portion
    const basePortion = baseRate;

    // Calculate performance portion (using CPE as default)
    const performancePortion = await this.calculateCPE(deal, performanceMetrics);
    
    // Combine
    const finalAmount = basePortion + (performancePortion.finalAmount * performanceWeight);

    return {
      basePortion: parseFloat(basePortion.toFixed(2)),
      performancePortion: performancePortion,
      performanceWeight,
      finalAmount: parseFloat(finalAmount.toFixed(2))
    };
  }

  // ==================== CALCULATE REFUND AMOUNT ====================
  calculateRefundAmount(originalAmount, daysSincePayment, reason) {
    let refundPercentage = 100;

    switch(reason) {
      case 'cancellation':
        if (daysSincePayment <= 1) refundPercentage = 100;
        else if (daysSincePayment <= 3) refundPercentage = 75;
        else if (daysSincePayment <= 7) refundPercentage = 50;
        else refundPercentage = 25;
        break;

      case 'dissatisfaction':
        refundPercentage = 70; // Partial refund
        break;

      case 'fraud':
        refundPercentage = 100; // Full refund
        break;

      case 'duplicate':
        refundPercentage = 100; // Full refund
        break;

      default:
        refundPercentage = 50; // Default partial refund
    }

    const refundAmount = (originalAmount * refundPercentage) / 100;

    return {
      originalAmount,
      refundPercentage,
      refundAmount: parseFloat(refundAmount.toFixed(2)),
      reason,
      daysSincePayment
    };
  }

  // ==================== CALCULATE TAX ====================
  calculateTax(amount, taxRate = 0, taxInclusive = false) {
    if (taxRate === 0) {
      return {
        subtotal: amount,
        tax: 0,
        total: amount
      };
    }

    if (taxInclusive) {
      // Amount includes tax
      const subtotal = amount / (1 + taxRate / 100);
      const tax = amount - subtotal;
      return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: amount,
        taxRate
      };
    } else {
      // Tax is added on top
      const tax = amount * (taxRate / 100);
      return {
        subtotal: amount,
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat((amount + tax).toFixed(2)),
        taxRate
      };
    }
  }

  // ==================== CALCULATE SPLIT PAYMENT ====================
  calculateSplitPayment(amount, splits) {
    // splits: [{ userId, percentage }, ...]
    let totalPercentage = 0;
    const results = [];

    for (const split of splits) {
      totalPercentage += split.percentage;
      const splitAmount = (amount * split.percentage) / 100;
      results.push({
        userId: split.userId,
        percentage: split.percentage,
        amount: parseFloat(splitAmount.toFixed(2))
      });
    }

    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Split percentages must total 100%');
    }

    return {
      totalAmount: amount,
      splits: results,
      totalPercentage
    };
  }

  // ==================== CALCULATE MILESTONE PAYMENT ====================
  calculateMilestonePayment(totalAmount, milestones) {
    // milestones: [{ name, percentage, completed }, ...]
    let totalPaid = 0;
    const results = [];

    for (const milestone of milestones) {
      const milestoneAmount = (totalAmount * milestone.percentage) / 100;
      
      if (milestone.completed) {
        totalPaid += milestoneAmount;
      }

      results.push({
        name: milestone.name,
        percentage: milestone.percentage,
        amount: parseFloat(milestoneAmount.toFixed(2)),
        completed: milestone.completed || false,
        paid: milestone.completed ? milestoneAmount : 0
      });
    }

    return {
      totalAmount,
      milestones: results,
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      remainingAmount: parseFloat((totalAmount - totalPaid).toFixed(2))
    };
  }

  // ==================== CALCULATE DISCOUNT ====================
  calculateDiscount(amount, discountType, discountValue) {
    let discount = 0;
    let finalAmount = amount;

    switch(discountType) {
      case 'percentage':
        discount = (amount * discountValue) / 100;
        finalAmount = amount - discount;
        break;

      case 'fixed':
        discount = Math.min(discountValue, amount);
        finalAmount = amount - discount;
        break;

      case 'bogo':
        // Buy one get one - 50% off second
        discount = amount * 0.25; // Simplified
        finalAmount = amount - discount;
        break;

      default:
        throw new Error('Invalid discount type');
    }

    return {
      originalAmount: amount,
      discountType,
      discountValue,
      discount: parseFloat(discount.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      savings: parseFloat((discount / amount * 100).toFixed(2))
    };
  }
}

module.exports = new PaymentCalculator();