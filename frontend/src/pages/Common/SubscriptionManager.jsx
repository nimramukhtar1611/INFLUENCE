import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, CreditCard, History, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../context/SubscriptionContext';

const formatCurrency = (value, currency = 'usd') => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
    minimumFractionDigits: 2
  }).format(numeric);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const SubscriptionManager = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    plans,
    currentSubscription,
    paymentMethods,
    invoices,
    upcomingInvoice,
    limits,
    usage,
    loading,
    busy,
    isSubscriptionUser,
    refreshAll,
    subscribe,
    changePlan,
    previewPlanChange,
    cancelSubscription,
    reactivateSubscription,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    applyCoupon,
    downloadInvoice
  } = useSubscription();

  const [interval, setInterval] = useState('month');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [newPaymentMethodId, setNewPaymentMethodId] = useState('');
  const [changePreview, setChangePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedPlan = params.get('plan');
    const requestedInterval = params.get('interval');

    if (requestedPlan) setSelectedPlanId(requestedPlan);
    if (requestedInterval === 'year' || requestedInterval === 'month') {
      setInterval(requestedInterval);
    }
  }, [location.search]);

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const activePlanId = currentSubscription?.planId;
  const defaultMethod = useMemo(
    () => paymentMethods.find((method) => method.isDefault) || null,
    [paymentMethods]
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const handleSubscribeOrChange = async () => {
    if (!selectedPlan) return;

    if (currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing') {
      await changePlan({ newPlanId: selectedPlan.id, interval });
      return;
    }

    const chosenPaymentMethod = paymentMethodId || defaultMethod?.id || undefined;
    await subscribe({
      planId: selectedPlan.id,
      interval,
      paymentMethodId: chosenPaymentMethod
    });
  };

  const handlePreview = async () => {
    if (!selectedPlanId || !currentSubscription) return;

    setPreviewLoading(true);
    const response = await previewPlanChange({ newPlanId: selectedPlanId, interval });
    setChangePreview(response.success ? response.preview : null);
    setPreviewLoading(false);
  };

  if (!isSubscriptionUser) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-2 text-gray-600">Subscriptions are available for brand and creator accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
          <p className="text-gray-600">Manage plan, invoices, payment methods, and usage limits.</p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          disabled={loading || busy}
          className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Current Subscription</h2>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            {currentSubscription?.status || 'none'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-gray-500">Plan</p>
            <p className="text-gray-900 font-semibold mt-1">{currentSubscription?.planDetails?.name || 'No active plan'}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-gray-500">Billing Period Ends</p>
            <p className="text-gray-900 font-semibold mt-1">{formatDate(currentSubscription?.billingPeriod?.end)}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-gray-500">Upcoming Invoice</p>
            <p className="text-gray-900 font-semibold mt-1">
              {upcomingInvoice ? formatCurrency(upcomingInvoice.amount, upcomingInvoice.currency) : '-'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cancelSubscription({ cancelAtPeriodEnd: true })}
            disabled={!currentSubscription || busy}
            className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel At Period End
          </button>
          <button
            type="button"
            onClick={reactivateSubscription}
            disabled={!currentSubscription?.cancelAtPeriodEnd || busy}
            className="px-4 py-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            Reactivate
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Choose Plan</h2>
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`px-3 py-1.5 rounded-md text-sm ${interval === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`px-3 py-1.5 rounded-md text-sm ${interval === 'year' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isActive = activePlanId === plan.id;
            const displayPrice = interval === 'year' ? Number(plan.price || 0) * 12 : Number(plan.price || 0);

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`text-left p-4 rounded-xl border transition ${
                  isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {isActive ? <CheckCircle className="w-5 h-5 text-green-600" /> : null}
                </div>
                <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
                <p className="mt-3 text-xl font-bold text-gray-900">{formatCurrency(displayPrice, plan.currency)}</p>
                <p className="text-xs text-gray-500">per {interval}</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  {(plan.features || []).slice(0, 4).map((feature) => (
                    <li key={String(feature)} className="flex items-start">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 mr-2 mt-0.5" />
                      <span>{typeof feature === 'string' ? feature : feature?.name || 'Feature'}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Use default payment method</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {String(method.brand || '').toUpperCase()} ****{method.last4} {method.isDefault ? '(default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter coupon code"
              />
              <button
                type="button"
                onClick={() => applyCoupon(couponCode)}
                disabled={!couponCode || busy}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSubscribeOrChange}
            disabled={!selectedPlan || busy}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {currentSubscription ? 'Change Plan' : 'Subscribe'}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!currentSubscription || !selectedPlanId || previewLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Preview Change
          </button>
        </div>

        {changePreview ? (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <p className="font-semibold text-amber-900">Proration Preview</p>
            <p className="text-amber-800 mt-1">Amount due: {formatCurrency(changePreview.amountDue, changePreview.currency)}</p>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Methods
          </h2>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newPaymentMethodId}
              onChange={(e) => setNewPaymentMethodId(e.target.value)}
              placeholder="Stripe payment method ID (pm_...)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                addPaymentMethod(newPaymentMethodId, paymentMethods.length === 0);
                setNewPaymentMethodId('');
              }}
              disabled={!newPaymentMethodId || busy}
              className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-gray-500">No payment methods found.</p>
            ) : (
              paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {String(method.brand || '').toUpperCase()} ****{method.last4}
                    </p>
                    <p className="text-xs text-gray-500">Exp {method.expiryMonth}/{method.expiryYear}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault ? (
                      <button
                        type="button"
                        onClick={() => setDefaultPaymentMethod(method.id)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700"
                      >
                        Set Default
                      </button>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Default</span>
                    )}
                    <button
                      type="button"
                      onClick={() => deletePaymentMethod(method.id)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Invoices
          </h2>

          <div className="mt-4 space-y-2">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices available.</p>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invoice.number || invoice.id}</p>
                    <p className="text-xs text-gray-500">{formatDate(invoice.date)} - {formatCurrency(invoice.amount, invoice.currency)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadInvoice(invoice.id)}
                    className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Download
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Plan Usage</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Campaigns</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.campaignsUsed ?? 0} / {limits?.campaigns ?? '-'}</p>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Team Members</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.teamMembersUsed ?? 0} / {limits?.teamMembers ?? '-'}</p>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Active Deals</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.activeDealsUsed ?? 0} / {limits?.activeDeals ?? '-'}</p>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Storage</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.storageUsed ?? 0} / {limits?.storage ?? '-'}</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="fixed bottom-5 right-5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm shadow-lg inline-flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading subscription data...
        </div>
      ) : null}

      <p className="text-xs text-gray-500">Signed in as {user?.email}</p>
    </div>
  );
};

export default SubscriptionManager;
