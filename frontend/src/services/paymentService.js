import api from './api';

class PaymentService {
  
  // ==================== BALANCE ====================
 async getBalance() {
    try {
      const response = await api.get('/payments/balance');
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== TRANSACTIONS ====================
  async getTransactions(params = {}) {
    try {
      const response = await api.get('/payments/transactions', { params });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== PAYMENT METHODS ====================
 async getPaymentMethods() {
    try {
      const response = await api.get('/payments/methods');
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

async addPaymentMethod(methodData) {
    try {
      const response = await api.post('/payments/methods', methodData);
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }


async setDefaultMethod(methodId) {
    try {
      const response = await api.put(`/payments/methods/${methodId}/default`);
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

   async deletePaymentMethod(methodId) {
    try {
      const response = await api.delete(`/payments/methods/${methodId}`);
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== WITHDRAWALS ====================
async getWithdrawals(params = {}) {
    // This might be through transactions or separate endpoint. We'll use transactions with type filter.
    return this.getTransactions({ ...params, type: 'withdrawal' });
  }

 async requestWithdrawal(amount, methodId) {
    try {
      const response = await api.post('/payments/withdraw', { amount, methodId });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cancelWithdrawal(withdrawalId) {
    try {
      console.log('Cancelling withdrawal:', withdrawalId);
      const response = await api.post(`/payments/withdrawals/${withdrawalId}/cancel`);
      
      return {
        success: true,
        message: response.message || 'Withdrawal cancelled'
      };
    } catch (error) {
      console.error('Cancel withdrawal error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to cancel withdrawal'
      };
    }
  }

  // ==================== INVOICES ====================
  async getInvoices(page = 1, limit = 10) {
    try {
      console.log('Fetching invoices...');
      const response = await api.get('/payments/invoices', {
        params: { page, limit }
      });
      
      return {
        success: true,
        invoices: response.invoices || [],
        pagination: response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        }
      };
    } catch (error) {
      console.error('Get invoices error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get invoices',
        invoices: []
      };
    }
  }

  async downloadInvoice(invoiceId) {
    try {
      console.log('Downloading invoice:', invoiceId);
      const response = await api.download(
        `/payments/invoices/${invoiceId}/download`,
        `invoice-${invoiceId}.pdf`
      );
      
      return {
        success: true,
        ...response
      };
    } catch (error) {
      console.error('Download invoice error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to download invoice'
      };
    }
  }

  // ==================== TAX DOCUMENTS ====================
  async getTaxDocuments() {
    try {
      console.log('Fetching tax documents...');
      const response = await api.get('/payments/tax-documents');
      
      return {
        success: true,
        documents: response.documents || []
      };
    } catch (error) {
      console.error('Get tax documents error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get tax documents'
      };
    }
  }

  async updateTaxInfo(taxData) {
    try {
      console.log('Updating tax info:', taxData);
      const response = await api.put('/payments/tax-info', taxData);
      
      return {
        success: true,
        message: response.message || 'Tax information updated'
      };
    } catch (error) {
      console.error('Update tax info error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to update tax info'
      };
    }
  }

  // ==================== STRIPE INTEGRATION ====================
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      console.log('Creating payment intent:', { amount, currency });
      const response = await api.post('/payments/create-intent', {
        amount,
        currency,
        metadata
      });
      
      return {
        success: true,
        clientSecret: response.clientSecret,
        paymentIntentId: response.paymentIntentId
      };
    } catch (error) {
      console.error('Create payment intent error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to create payment intent'
      };
    }
  }

  async confirmPayment(paymentIntentId) {
    try {
      console.log('Confirming payment:', paymentIntentId);
      const response = await api.post('/payments/confirm', {
        paymentIntentId
      });
      
      return {
        success: true,
        payment: response.payment
      };
    } catch (error) {
      console.error('Confirm payment error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to confirm payment'
      };
    }
  }

  async createSetupIntent() {
    try {
      console.log('Creating setup intent...');
      const response = await api.post('/payments/setup-intent');
      
      return {
        success: true,
        clientSecret: response.clientSecret,
        setupIntentId: response.setupIntentId
      };
    } catch (error) {
      console.error('Create setup intent error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to create setup intent'
      };
    }
  }

  // ==================== ESCROW ====================
  async createEscrow(dealId) {
    try {
      console.log('Creating escrow for deal:', dealId);
      const response = await api.post('/payments/escrow', { dealId });
      
      return {
        success: true,
        payment: response.payment,
        message: response.message || 'Escrow created successfully'
      };
    } catch (error) {
      console.error('Create escrow error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to create escrow'
      };
    }
  }

  async releasePayment(dealId) {
    try {
      console.log('Releasing payment for deal:', dealId);
      const response = await api.post(`/payments/release/${dealId}`);
      
      return {
        success: true,
        message: response.message || 'Payment released successfully'
      };
    } catch (error) {
      console.error('Release payment error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to release payment'
      };
    }
  }

  // ==================== UTILITY ====================
  calculateFees(amount) {
    const platformFee = amount * 0.1; // 10%
    const stripeFee = amount * 0.029 + 0.3; // 2.9% + $0.30
    const totalFees = platformFee + stripeFee;
    const netAmount = amount - totalFees;

    return {
      amount,
      platformFee: parseFloat(platformFee.toFixed(2)),
      stripeFee: parseFloat(stripeFee.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      netAmount: parseFloat(netAmount.toFixed(2))
    };
  }
}

export default new PaymentService();