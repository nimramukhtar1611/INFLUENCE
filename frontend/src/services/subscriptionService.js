import api from './api';

const normalizeMethod = (method = {}, source = 'subscription') => {
  const last4 = method.last4 || method.card?.last4 || (method.accountNumber ? String(method.accountNumber).slice(-4) : undefined);
  const expiryMonth = method.expiryMonth || method.exp_month || method.card?.exp_month;
  const expiryYear = method.expiryYear || method.exp_year || method.card?.exp_year;

  return {
    id: method.id || method._id,
    brand: method.brand || method.card?.brand || (method.type === 'paypal' ? 'paypal' : undefined),
    last4,
    expiryMonth,
    expiryYear,
    isDefault: Boolean(method.isDefault),
    type: method.type || 'card',
    paypalEmail: method.paypalEmail,
    bankName: method.bankName,
    source,
    nonStripe: source !== 'subscription'
  };
};

class SubscriptionService {
  async getPlans(userType, interval = 'month') {
    try {
      const response = await api.get('/subscriptions/plans', {
        params: {
          ...(userType ? { userType } : {}),
          interval
        }
      });
      return {
        success: !!response.data?.success,
        plans: response.data?.plans || []
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to load plans' };
    }
  }

  async getCurrentSubscription() {
    try {
      const response = await api.get('/subscriptions/current');
      return {
        success: !!response.data?.success,
        subscription: response.data?.subscription || null
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to load current subscription' };
    }
  }

  async subscribe(payload) {
    try {
      const response = await api.post('/subscriptions/subscribe', payload);
      return {
        success: !!response.data?.success,
        subscription: response.data?.subscription || null,
        requiresAction: !!response.data?.requiresAction,
        clientSecret: response.data?.clientSecret || null,
        message: response.data?.message || 'Subscription created'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to subscribe' };
    }
  }

  async createCheckoutSession(payload) {
    try {
      const response = await api.post('/subscriptions/checkout-session', payload);
      return {
        success: !!response.data?.success,
        url: response.data?.url || null,
        sessionId: response.data?.sessionId || null
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to start checkout' };
    }
  }

  async createBillingPortalSession() {
    try {
      const response = await api.post('/subscriptions/billing-portal');
      return {
        success: !!response.data?.success,
        url: response.data?.url || null
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to open billing portal' };
    }
  }

  async createPlanChangeSession(payload) {
    try {
      const response = await api.post('/subscriptions/plan-change-session', payload);
      return {
        success: !!response.data?.success,
        url: response.data?.url || null,
        message: response.data?.message || null
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to start plan change' };
    }
  }

  async changePlan(payload) {
    try {
      const response = await api.put('/subscriptions/change', payload);
      return {
        success: !!response.data?.success,
        subscription: response.data?.subscription || null,
        message: response.data?.message || 'Plan changed'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to change plan' };
    }
  }

  async previewPlanChange(payload) {
    try {
      const response = await api.post('/subscriptions/preview-change', payload);
      return {
        success: !!response.data?.success,
        preview: response.data?.preview || null
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to preview plan change' };
    }
  }

  async cancelSubscription(payload = {}) {
    try {
      const response = await api.post('/subscriptions/cancel', payload);
      return {
        success: !!response.data?.success,
        subscription: response.data?.subscription || null,
        message: response.data?.message || 'Subscription canceled'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to cancel subscription' };
    }
  }

  async reactivateSubscription() {
    try {
      const response = await api.post('/subscriptions/reactivate');
      return {
        success: !!response.data?.success,
        subscription: response.data?.subscription || null,
        message: response.data?.message || 'Subscription reactivated'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to reactivate subscription' };
    }
  }

  async getPaymentMethods() {
    try {
      const response = await api.get('/subscriptions/payment-methods');
      const methods = (response.data?.paymentMethods || [])
        .map((method) => normalizeMethod(method, 'subscription'))
        .filter((method) => !!method.id);

      return {
        success: !!response.data?.success,
        paymentMethods: methods
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to load payment methods' };
    }
  }

  async getBillingMethods() {
    try {
      const response = await api.get('/payments/methods');
      const methods = (response.data?.paymentMethods || [])
        .map((method) => normalizeMethod(method, 'billing'))
        .filter((method) => !!method.id);

      return {
        success: !!response.data?.success,
        paymentMethods: methods
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to load billing methods' };
    }
  }

  async addPaymentMethod(paymentMethodId, setDefault = false) {
    try {
      const response = await api.post('/subscriptions/payment-methods', {
        paymentMethodId,
        setDefault
      });
      return {
        success: !!response.data?.success,
        paymentMethod: response.data?.paymentMethod || null,
        message: response.data?.message || 'Payment method added'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to add payment method' };
    }
  }

  async setDefaultPaymentMethod(methodId) {
    try {
      const response = await api.put(`/subscriptions/payment-methods/${methodId}/default`);
      return {
        success: !!response.data?.success,
        message: response.data?.message || 'Default payment method updated'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to update default payment method' };
    }
  }

  async deletePaymentMethod(methodId) {
    try {
      const response = await api.delete(`/subscriptions/payment-methods/${methodId}`);
      return {
        success: !!response.data?.success,
        message: response.data?.message || 'Payment method deleted'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to delete payment method' };
    }
  }

  async getHistory(page = 1, limit = 10) {
    try {
      const response = await api.get('/subscriptions/history', {
        params: { page, limit }
      });
      return {
        success: !!response.data?.success,
        subscriptions: response.data?.subscriptions || [],
        invoices: response.data?.invoices || [],
        pagination: response.data?.pagination || { page: 1, limit, total: 0, pages: 1 }
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to load subscription history' };
    }
  }

  async getUpcomingInvoice() {
    try {
      const response = await api.get('/subscriptions/upcoming-invoice');
      return {
        success: !!response.data?.success,
        upcomingInvoice: response.data?.upcomingInvoice || null
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to load upcoming invoice' };
    }
  }

  async applyCoupon(couponCode) {
    try {
      const response = await api.post('/subscriptions/apply-coupon', { couponCode });
      return {
        success: !!response.data?.success,
        discount: response.data?.discount || null,
        message: response.data?.message || 'Coupon applied'
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to apply coupon' };
    }
  }

  async getLimits() {
    try {
      const response = await api.get('/subscriptions/limits');
      return {
        success: !!response.data?.success,
        limits: response.data?.limits || null,
        usage: response.data?.usage || null,
        can: response.data?.can || null,
        hasSubscription: !!response.data?.hasSubscription,
        plan: response.data?.plan || null
      };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to load limits' };
    }
  }

  async downloadInvoice(invoiceId) {
    try {
      await api.download(`/subscriptions/invoices/${invoiceId}/download`, `subscription-invoice-${invoiceId}.pdf`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error?.error || error?.message || 'Failed to download invoice' };
    }
  }
}

export default new SubscriptionService();
