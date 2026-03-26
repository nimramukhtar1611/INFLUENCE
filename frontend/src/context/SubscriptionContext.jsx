import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import subscriptionService from '../services/subscriptionService';

const SubscriptionContext = createContext(null);

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
};

export const SubscriptionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [history, setHistory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [upcomingInvoice, setUpcomingInvoice] = useState(null);
  const [limits, setLimits] = useState(null);
  const [usage, setUsage] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isSubscriptionUser = isAuthenticated && ['brand', 'creator'].includes(user?.userType);

  const loadPlans = useCallback(async (interval = 'month') => {
    if (!isSubscriptionUser) return;

    const response = await subscriptionService.getPlans(user?.userType, interval);
    if (response.success) {
      setPlans(response.plans);
      return response.plans;
    }

    setError(response.error || 'Failed to load plans');
    return [];
  }, [isSubscriptionUser, user?.userType]);

  const loadCurrentSubscription = useCallback(async () => {
    if (!isSubscriptionUser) return null;

    const response = await subscriptionService.getCurrentSubscription();
    if (response.success) {
      setCurrentSubscription(response.subscription);
      return response.subscription;
    }

    setError(response.error || 'Failed to load current subscription');
    return null;
  }, [isSubscriptionUser]);

  const loadPaymentMethods = useCallback(async () => {
    if (!isSubscriptionUser) return [];

    const response = await subscriptionService.getPaymentMethods();
    if (response.success) {
      let methods = response.paymentMethods || [];

      if (methods.length === 0) {
        const billingResponse = await subscriptionService.getBillingMethods();
        if (billingResponse.success) {
          methods = billingResponse.paymentMethods || [];
        }
      }

      setPaymentMethods(methods);
      return methods;
    }

    setError(response.error || 'Failed to load payment methods');
    return [];
  }, [isSubscriptionUser]);

  const loadHistory = useCallback(async () => {
    if (!isSubscriptionUser) return;

    const response = await subscriptionService.getHistory(1, 20);
    if (response.success) {
      setHistory(response.subscriptions);
      setInvoices(response.invoices);
      return;
    }

    setError(response.error || 'Failed to load subscription history');
  }, [isSubscriptionUser]);

  const loadUpcomingInvoice = useCallback(async () => {
    if (!isSubscriptionUser) return;

    const response = await subscriptionService.getUpcomingInvoice();
    if (response.success) {
      setUpcomingInvoice(response.upcomingInvoice);
      return;
    }

    setError(response.error || 'Failed to load upcoming invoice');
  }, [isSubscriptionUser]);

  const loadLimits = useCallback(async () => {
    if (!isSubscriptionUser) return;

    const response = await subscriptionService.getLimits();
    if (response.success) {
      setLimits(response.limits);
      setUsage(response.usage);
      setPermissions(response.can);
      return;
    }

    setError(response.error || 'Failed to load limits');
  }, [isSubscriptionUser]);

  const refreshAll = useCallback(async () => {
    if (!isSubscriptionUser) return;

    setLoading(true);
    setError(null);

    await Promise.all([
      loadPlans(),
      loadCurrentSubscription(),
      loadPaymentMethods(),
      loadHistory(),
      loadUpcomingInvoice(),
      loadLimits()
    ]);

    setLoading(false);
  }, [isSubscriptionUser, loadCurrentSubscription, loadHistory, loadLimits, loadPaymentMethods, loadPlans, loadUpcomingInvoice]);

  useEffect(() => {
    if (isSubscriptionUser) {
      refreshAll();
    }
  }, [isSubscriptionUser, refreshAll]);

  const subscribe = useCallback(async ({ planId, interval = 'month', paymentMethodId }) => {
    setBusy(true);
    const response = await subscriptionService.subscribe({ planId, interval, paymentMethodId });
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to subscribe');
      return response;
    }

    if (response.requiresAction) {
      toast('Additional payment confirmation is required.', { icon: 'ℹ️' });
      return response;
    }

    toast.success(response.message || 'Subscription updated');
    await refreshAll();
    return response;
  }, [refreshAll]);

  const startCheckout = useCallback(async ({ planId, interval = 'month' }) => {
    setBusy(true);
    const response = await subscriptionService.createCheckoutSession({ planId, interval });
    setBusy(false);

    if (!response.success || !response.url) {
      toast.error(response.error || 'Failed to start Stripe checkout');
      return response;
    }

    window.location.assign(response.url);
    return response;
  }, []);

  const openBillingPortal = useCallback(async () => {
    setBusy(true);
    const response = await subscriptionService.createBillingPortalSession();
    setBusy(false);

    if (!response.success || !response.url) {
      toast.error(response.error || 'Failed to open billing portal');
      return response;
    }

    window.location.assign(response.url);
    return response;
  }, []);

  const startPlanChange = useCallback(async ({ planId, interval = 'month' }) => {
    setBusy(true);
    const response = await subscriptionService.createPlanChangeSession({ planId, interval });
    setBusy(false);

    if (!response.success || !response.url) {
      toast.error(response.error || 'Failed to start plan update');
      return response;
    }

    window.location.assign(response.url);
    return response;
  }, []);

  const changePlan = useCallback(async ({ newPlanId, interval = 'month' }) => {
    setBusy(true);
    const response = await subscriptionService.changePlan({ newPlanId, interval });
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to change plan');
      return response;
    }

    toast.success(response.message || 'Plan changed');
    await refreshAll();
    return response;
  }, [refreshAll]);

  const previewPlanChange = useCallback(async ({ newPlanId, interval = 'month' }) => {
    return subscriptionService.previewPlanChange({ newPlanId, interval });
  }, []);

  const cancelSubscription = useCallback(async ({ cancelAtPeriodEnd = true, reason = '' } = {}) => {
    setBusy(true);
    const response = await subscriptionService.cancelSubscription({ cancelAtPeriodEnd, reason });
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to cancel subscription');
      return response;
    }

    toast.success(response.message || 'Subscription canceled');
    await refreshAll();
    return response;
  }, [refreshAll]);

  const reactivateSubscription = useCallback(async () => {
    setBusy(true);
    const response = await subscriptionService.reactivateSubscription();
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to reactivate subscription');
      return response;
    }

    toast.success(response.message || 'Subscription reactivated');
    await refreshAll();
    return response;
  }, [refreshAll]);

  const addPaymentMethod = useCallback(async (paymentMethodId, setDefault = false) => {
    if (!paymentMethodId) {
      toast.error('Payment method ID is required');
      return { success: false };
    }

    setBusy(true);
    const response = await subscriptionService.addPaymentMethod(paymentMethodId, setDefault);
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to add payment method');
      return response;
    }

    toast.success(response.message || 'Payment method added');
    await loadPaymentMethods();
    return response;
  }, [loadPaymentMethods]);

  const setDefaultPaymentMethod = useCallback(async (methodId) => {
    setBusy(true);
    const response = await subscriptionService.setDefaultPaymentMethod(methodId);
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to update default payment method');
      return response;
    }

    toast.success(response.message || 'Default payment method updated');
    await loadPaymentMethods();
    return response;
  }, [loadPaymentMethods]);

  const deletePaymentMethod = useCallback(async (methodId) => {
    setBusy(true);
    const response = await subscriptionService.deletePaymentMethod(methodId);
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to delete payment method');
      return response;
    }

    toast.success(response.message || 'Payment method deleted');
    await loadPaymentMethods();
    return response;
  }, [loadPaymentMethods]);

  const applyCoupon = useCallback(async (couponCode) => {
    setBusy(true);
    const response = await subscriptionService.applyCoupon(couponCode);
    setBusy(false);

    if (!response.success) {
      toast.error(response.error || 'Failed to apply coupon');
      return response;
    }

    toast.success(response.message || 'Coupon applied');
    await refreshAll();
    return response;
  }, [refreshAll]);

  const downloadInvoice = useCallback(async (invoiceId) => {
    const response = await subscriptionService.downloadInvoice(invoiceId);
    if (!response.success) {
      toast.error(response.error || 'Failed to download invoice');
      return response;
    }

    toast.success('Invoice downloaded');
    return response;
  }, []);

  const value = useMemo(() => ({
    plans,
    currentSubscription,
    paymentMethods,
    history,
    invoices,
    upcomingInvoice,
    limits,
    usage,
    permissions,
    loading,
    busy,
    error,
    isSubscriptionUser,
    loadPlans,
    loadCurrentSubscription,
    loadPaymentMethods,
    loadHistory,
    loadUpcomingInvoice,
    loadLimits,
    refreshAll,
    subscribe,
    startCheckout,
    openBillingPortal,
    startPlanChange,
    changePlan,
    previewPlanChange,
    cancelSubscription,
    reactivateSubscription,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    applyCoupon,
    downloadInvoice
  }), [
    plans,
    currentSubscription,
    paymentMethods,
    history,
    invoices,
    upcomingInvoice,
    limits,
    usage,
    permissions,
    loading,
    busy,
    error,
    isSubscriptionUser,
    loadPlans,
    loadCurrentSubscription,
    loadPaymentMethods,
    loadHistory,
    loadUpcomingInvoice,
    loadLimits,
    refreshAll,
    subscribe,
    startCheckout,
    openBillingPortal,
    startPlanChange,
    changePlan,
    previewPlanChange,
    cancelSubscription,
    reactivateSubscription,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    applyCoupon,
    downloadInvoice
  ]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export default SubscriptionContext;
